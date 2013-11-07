<?php

namespace models\dto;

use models\MessageListModel;

use models\MessageModel;

use models\UnreadMessageModel;
use models\UnreadActivityModel;

use models\UserModel;

use models\ProjectModel;

use models\TextListModel;

use models\TextModel;


class ProjectPageDto
{
	/**
	 *
	 * @param string $projectId
	 * @param string $userId
	 * @returns array - the DTO array
	 */
	public static function encode($projectId, $userId) {
		$userModel = new UserModel($userId);
		$projectModel = new ProjectModel($projectId);

		$data = array();
		$data['rights'] = RightsHelper::encode($userModel, $projectModel);
		$data['project'] = array(
				'name' => $projectModel->projectname,
				'id' => $projectId);
		
		
		// text list
		$textList = new TextListModel($projectModel);
		$textList->read();
		$data['texts'] = array();
		foreach ($textList->entries as $entry) {
			$textModel = new TextModel($projectModel, $entry['id']);
			$questionList = $textModel->listQuestionsWithAnswers();
			// Just want count of questions and responses, not whole list
			$entry['questionCount'] = $questionList->count;
			$responseCount = 0; // "Responses" = answers + comments
			foreach ($questionList->entries as $q) {
				foreach ($q['answers'] as $a) {
					$commentCount = count($a['comments']);
					$responseCount += ($commentCount+1); // +1 for this answer
				}
			}
			$entry['responseCount'] = $responseCount;

			$data['texts'][] = $entry;
		}
		
		// project member list
		$members = $projectModel->listUsers();
		$data['members'] = $members->entries;
		
		// project activity feed
		$data['activity'] = ActivityListDto::getActivityForProjectWithUnreadForUser($projectModel, $userId);
		
		// broadcast messages
		$unreadMessages = new UnreadMessageModel($userId, $projectId);
		$unreadMessageIds = $unreadMessages->unreadItems();
		$messageList = new MessageListModel($projectModel);
		$messageList->read();
		$data['messages'] =  array(
			'items' => $messageList->entries,
			'unread' => $unreadMessageIds
		);
		
		return $data;
	}
}

?>
