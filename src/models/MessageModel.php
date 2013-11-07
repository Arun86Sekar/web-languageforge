<?php

namespace models;

use models\mapper\Id;
use models\mapper\MessageModelMongoMapper;

class MessageModel extends \models\mapper\MapperModel
{
	/**
	 * @var ProjectModel;
	 */
	private $_projectModel;
	
	public function __construct($projectModel, $id = '')
	{
		$this->id = new Id();
		$this->_projectModel = $projectModel;
		$databaseName = $projectModel->databaseName();
		parent::__construct(MessageModelMongoMapper::connect($databaseName), $id);
	}

	public static function remove($databaseName, $id) {
		MessageModelMongoMapper::connect($databaseName)->remove($id);
	}

	public $id;
	
	public $subject;
	
	public $content;
	
}

?>
