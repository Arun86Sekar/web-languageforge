<?php

namespace models\mapper;

class MessageModelMongoMapper extends \models\mapper\MongoMapper
{
	/**
	 * @var TextModelMongoMapper[]
	 */
	private static $_pool = array();
	
	/**
	 * @param string $databaseName
	 * @return TextModelMongoMapper
	 */
	public static function connect($databaseName) {
		if (!isset(static::$_pool[$databaseName])) {
			static::$_pool[$databaseName] = new MessageModelMongoMapper($databaseName, 'messages');
		}
		return static::$_pool[$databaseName];
	}
	
}