<?php

namespace models;

class MessageListModel extends \models\mapper\MapperListModel
{

	public function __construct($projectModel)
	{
		parent::__construct(
			\models\mapper\MessageModelMongoMapper::connect($projectModel->databaseName()),
			array('content' => array('$regex' => '')),
			array('subject', 'content')
		);
	}
	
}