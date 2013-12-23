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
		$dto['danglingUserList'] = array();
		
		if ($canListUsers) {
			$userList = new UserListModel();
			$userList->read();
			
			$dto['userList']['count'] = $userList->count;
			$dto['userList']['entries'] = $userList->entries;
			
			$dto['danglingUserList'] = self::danglingUserList($userList, $projectList);
		} else {
			$dto['userList']['count'] = 0;
			$dto['userList']['entries'] = array();
			
			$dto['danglingUserList']['count'] = 0;
			$dto['danglingUserList']['entries'] = array();
		}
		
		return $dto;
	}
	
	/**
	 * List any user who is not in a project but the project has the user
	 * @param UserListModel $userList
	 * @param ProjectList_UserModel $projectList
	 * @return array userList
	 */
	private static function danglingUserList($userList, $projectList) {
		$result = array();
		$result['count'] = 0;
		$result['entries'] = array();
		echo "<h3>Dangling UserList</h3>";
		foreach ($userList->entries as $userEntry) {
			$user = new UserModel($userEntry['id']);
			if ($user->projects && $user->projects->refs) {
				echo "<p>User: " . $user->name . " has Projects:</p>";
				echo "<ul>";
// 				echo "<pre>";
// 				var_dump($projectList);
// 				echo "</pre>";
				$invalidProjects = array();
				foreach ($user->projects->refs as $projectRef) {
					echo "<li>ProjectRef: " . $projectRef;
					if (! self::projectRefInList($projectRef, $projectList)) {
						$invalidProjects[] = $projectRef->asString();
						echo " is not a project";
					}
					echo "</li>";
				}
				echo "</ul>";
				if (count($invalidProjects) > 0) {
					$result['entries'][] = array(
							'id' => $userEntry['id'],
							'projects' => $invalidProjects
						);
					$result['count']++;
				}
			}
		}
		
		return $result;
	}
	
	/**
	 * Returns true if the projectRef is in the projectList  
	 * @param Id $projectRef
	 * @param ProjectList_UserModel $projectList
	 * @return boolean
	 */
	private static function projectRefInList($projectRef, $projectList) {
		foreach($projectList->entries as $projectListRef) {
			if ($projectRef->asString() == $projectListRef['id']) {
		        return true;
		    }
		}			

		return false;
	}
	
}

?>
