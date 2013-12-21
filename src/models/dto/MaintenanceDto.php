<?php

namespace models\dto;

use models\ProjectList_UserModel;
use models\ProjectModel;
use models\UserModel;
use models\UserListModel;
use models\rights\Operation;
use models\rights\Domain;

class MaintenanceDto
{
	/**
	 * Provides database maintenance information
	 * @param string $userId
	 * @returns array - the DTO array
	 */
	public static function encode($userId) {
		
		// list projects
		$user = new UserModel($userId);
		$canListAllProjects = $user->hasRight(Domain::PROJECTS + Operation::VIEW_OTHER);
	
		$projectList = new ProjectList_UserModel();
		if ($canListAllProjects) {
			$projectList->readAll();
		} else {
			$projectList->readUserProjects($userId);
		}

		$dto = array();
		$dto['projectList'] = array();
		$dto['projectList']['count'] = $projectList->count;
		$dto['projectList']['entries'] = $projectList->entries;
		
		// list users
		$canListUsers = $user->hasRight(Domain::USERS + Operation::VIEW_OTHER);
		$dto['userList'] = array();
		
		if ($canListUsers) {
			$userList = new UserListModel();
			$userList->read();
			
			$dto['userList']['count'] = $userList->count;
			$dto['userList']['entries'] = $userList->entries;
		} else {
			$dto['userList']['count'] = 0;
			$dto['userList']['entries'] = array();
		}
		
		return $dto;
	}
	
}

?>
