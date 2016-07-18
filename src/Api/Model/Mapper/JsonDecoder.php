<?php

namespace Api\Model\Mapper;

use Palaso\Utilities\CodeGuard;

class JsonDecoder
{
    /**
     * @param array $array
     * @return bool true if at least one key is a string, false otherwise
     */
    public static function is_assoc($array)
    {
        return (bool) count(array_filter(array_keys($array), 'is_string'));
    }

    /**
     * Sets the public properties of $model to values from $values[propertyName]
     * @param object $model
     * @param array $values A mixed array of JSON (like) data.
     * @param string $id
     */
    public static function decode($model, $values, $id = '')
    {
        $decoder = new JsonDecoder();
        $decoder->_decode($model, $values, $id);
    }

    /**
     * Sets the public properties of $model to values from $values[propertyName]
     * @param object|MapOf $model
     * @param array $values A mixed array of JSON (like) data.
     * @param string $id
     * @throws \Exception
     */
    protected function _decode($model, $values, $id)
    {
        CodeGuard::checkTypeAndThrow($values, 'array');
        $propertiesToIgnore = $this->getPrivateAndReadOnlyProperties($model);
        foreach ($this->getProperties($model) as $property => $value) {
            if (is_a($value, 'Api\Model\Mapper\Id') && get_class($value) == 'Api\Model\Mapper\Id') {
                 $this->decodeId($property, $model, $values, $id);
                 continue;
            }
            if (!array_key_exists($property, $values) || in_array($property, $propertiesToIgnore)) {
                continue;
            }
            if ($value === false) {
                $value = $model->{$property}; // To force the lazy evaluation to create the property.
            }
            if (is_a($value, 'Api\Model\Mapper\IdReference')) {
                $this->decodeIdReference($property, $model, $values);
            } elseif (is_a($value, 'Api\Model\Mapper\ArrayOf')) {
                $this->decodeArrayOf($property, $model->{$property}, $values[$property]);
            } elseif (is_a($value, 'Api\Model\Mapper\MapOf')) {
                $this->decodeMapOf($property, $model->{$property}, $values[$property]);
            } elseif (is_a($value, 'DateTime')) {
                $this->decodeDateTime($property, $model->{$property}, $values[$property]);
            } elseif (is_a($value, 'Api\Model\Mapper\ReferenceList')) {
                $this->decodeReferenceList($model->{$property}, $values[$property]);
            } elseif (is_object($value)) {
                $this->_decode($model->{$property}, $values[$property], '');
            } else {
                if (is_array($values[$property])) {
                    throw new \Exception("Must not decode array in '" . get_class($model) . "->" . $property . "'");
                }
                $model->{$property} = $values[$property];
            }
        }

        // support for nested MapOf
        if (is_a($model, 'Api\Model\Mapper\MapOf')) {
            $this->decodeMapOf($id, $model, $values);
        }

        $this->postDecode($model);
    }

    protected function postDecode($model)
    {
    }

    /**
     * @param string $key
     * @param object $model
     * @param array $values
     */
    public function decodeIdReference($key, $model, $values)
    {
        $model->$key = new IdReference($values[$key]);
    }

    /**
     * @param string $key
     * @param object $model
     * @param array $values
     * @param string $id
     */
    public function decodeId($key, $model, $values, $id)
    {
        $model->$key = new Id($values[$key]);
    }

    /**
     * @param string $key
     * @param ArrayOf $model
     * @param array $data
     * @throws \Exception
     */
    public function decodeArrayOf($key, $model, $data)
    {
        if ($data == null) {
            $data = array();
        }
        CodeGuard::checkTypeAndThrow($data, 'array');
        $propertiesToKeep = array();

        // check if array item class has any private, read-only or recursive properties
        if (get_class($this) == 'Api\Model\Mapper\JsonDecoder' && $model->hasGenerator()) {
            $arrayItem = $model->generate();
            $propertiesToKeep = $this->getPrivateAndReadOnlyProperties($arrayItem);
            $propertiesToKeep = $this->getRecursiveProperties($arrayItem, $propertiesToKeep);
        }

        $oldModelArray = $model->exchangeArray(array());
        foreach ($data as $index => $item) {
            if ($model->hasGenerator()) {
                $object = $model->generate($item);

                // put back private, read-only and recursive properties into new object that was just generated
                foreach ($propertiesToKeep as $property) {
                    if (array_key_exists($index, $oldModelArray)) {
                        $object->{$property} = $oldModelArray[$index]->{$property};
                    }
                }
                $this->_decode($object, $item, '');
                $model[] = $object;
            } else {
                if (is_array($item)) {
                    throw new \Exception("Must not decode array for value type '$key'");
                }
                $model[] = $item;
            }
        }
    }

    /**
     * @param string $key
     * @param MapOf $model
     * @param array $data
     * @throws \Exception
     */
    public function decodeMapOf($key, $model, $data)
    {
        if (is_null($data) || !is_array($data) && get_class($data) == 'stdClass') {
            $data = array();
        }
        CodeGuard::checkTypeAndThrow($data, 'array');
        $propertiesToKeep = array();

        // check if array item class has any private, read-only or recursive properties
        if (get_class($this) == 'Api\Model\Mapper\JsonDecoder' && $model->hasGenerator()) {
            foreach ($data as $itemKey => $item) {
                $mapItem = $model->generate($item);
                $propertiesToKeep = $this->getPrivateAndReadOnlyProperties($mapItem, $propertiesToKeep);
                $propertiesToKeep = $this->getRecursiveProperties($mapItem, $propertiesToKeep);
            }
        }

        $oldModelArray = $model->exchangeArray(array());
        foreach ($data as $itemKey => $item) {
            if ($model->hasGenerator()) {
                $object = $model->generate($item);

                // put back private, read-only and recursive properties into new object that was just generated
                foreach ($propertiesToKeep as $property) {
                    if (array_key_exists($itemKey, $oldModelArray) && property_exists($oldModelArray[$itemKey], $property)) {
                        $object->{$property} = $oldModelArray[$itemKey]->{$property};
                    }
                }
                $this->_decode($object, $item, $itemKey);
                $model[$itemKey] = $object;
            } else {
                if (is_array($item)) {
                    throw new \Exception("Must not decode array for value type '$key'");
                }
                $model[$itemKey] = $item;
            }
        }
    }

    /**
     * Decodes the mongo array into the ReferenceList $model
     * @param ReferenceList $model
     * @param array $data
     * @throws \Exception
     */
    public function decodeReferenceList($model, $data)
    {
        $model->refs = array();
        if (array_key_exists('refs', $data)) {
            // This likely came from an API client, who shouldn't be sending this.
            return;
        }
        $refsArray = $data;
        foreach ($refsArray as $objectId) {
            CodeGuard::checkTypeAndThrow($objectId, 'string');
            array_push($model->refs, new Id((string) $objectId));
        }
    }

    /**
     * @param string $key
     * @param object $model
     * @param string $data
     */
    public function decodeDateTime($key, &$model, $data)
    {
        $model = new \DateTime($data);
    }

    /**
     * @param ObjectForEncoding|object $model
     * @param array $properties to merge
     * @return array
     */
    private function getPrivateAndReadOnlyProperties($model, $properties = array())
    {
        if (get_class($this) == 'Api\Model\Mapper\JsonDecoder') {
            if (method_exists($model, 'getPrivateProperties')) {
                $properties = array_merge($properties, (array)$model->getPrivateProperties());
            }
            if (method_exists($model, 'getReadOnlyProperties')) {
                $properties = array_merge($properties, (array)$model->getReadOnlyProperties());
            }
        }

        return $properties;
    }

    /**
     * @param object $model
     * @param array $properties to merge
     * @return array
     */
    private function getRecursiveProperties($model, $properties = array())
    {
        if (get_class($this) == 'Api\Model\Mapper\JsonDecoder') {
            foreach ($this->getProperties($model) as $property => $value) {
                if ($value === false) {
                    $value = $model->{$property}; // To force the lazy evaluation to create the property.
                }

                if (is_a($value, 'Api\Model\Mapper\ArrayOf')) {
                    $properties[] = $property;
                } elseif (is_a($value, 'Api\Model\Mapper\MapOf')) {
                    $properties[] = $property;
                }
            }
        }

        return $properties;
    }

    /**
     * @param ObjectForEncoding|object $model
     * @return array
     */
    private function getProperties($model)
    {
        $properties = get_object_vars($model);
        if (method_exists($model, 'getLazyProperties')) {
            $properties = array_merge($properties, $model->getLazyProperties());
        }

        return $properties;
    }

}
