<?php

use models\ProjectSettingsModel;

use libraries\sfchecks\Communicate;

use models\ProjectModel;

use models\commands\UserCommands;

use models\commands\ProjectCommands;

use models\rights\Roles;
use models\UserModel;
use models\dto\ProjectPageDto;

use models\TextModel;
use models\QuestionModel;

require_once(dirname(__FILE__) . '/../TestConfig.php');
require_once(SimpleTestPath . 'autorun.php');
require_once(TestPath . 'common/MongoTestEnvironment.php');

class TestProjectPageDto extends UnitTestCase {

	function __construct() {
		$e = new MongoTestEnvironment();
		$e->clean();
	}

	function testEncode_TextWithQuestions_DtoReturnsExpectedData() {
		$e = new MongoTestEnvironment();

		$project = $e->createProject(SF_TESTPROJECT);
		$projectId = $project->id->asString();

		// Two texts, with different numbers of questions for each text
		$text1 = new TextModel($project);
		$text1->title = "Chapter 3";
		$text1->content = "I opened my eyes upon a strange and weird landscape. I knew that I was on Mars; …";
		$text1Id = $text1->write();

		$text2 = new TextModel($project);
		$text2->title = "Chapter 4";
		$text2->content = "We had gone perhaps ten miles when the ground began to rise very rapidly. …";
		$text2Id = $text2->write();

		// Answers are tied to specific users, so let's create some sample users
		$user1Id = $e->createUser("jcarter", "John Carter", "johncarter@example.com");
		$user1 = new UserModel($user1Id);
		$user2Id = $e->createUser("dthoris", "Dejah Thoris", "princess@example.com");
		$user2 = new UserModel($user2Id);
		
		// Two questions for text 1...
		$question1 = new QuestionModel($project);
		$question1->title = "Who is speaking?";
		$question1->description = "Who is telling the story in this text?";
		$question1->textRef->id = $text1Id;
		$question1Id = $question1->write();

		$question2 = new QuestionModel($project);
		$question2->title = "Where is the storyteller?";
		$question2->description = "The person telling this story has just arrived somewhere. Where is he?";
		$question2->textRef->id = $text1Id;
		$question2Id = $question2->write();

		// ... and one question for text 2.
		$question3 = new QuestionModel($project);
		$question3->title = "How far had they travelled?";
		$question3->description = "How far had the group just travelled when this text begins?";
		$question3->textRef->id = $text2Id;
		$question3Id = $question3->write();

		// member list 
		ProjectCommands::updateUserRole($projectId, ['id' => $user1Id, 'role' => Roles::USER]);
		ProjectCommands::updateUserRole($projectId, ['id' => $user2Id, 'role' => Roles::USER]);
		
		// broadcast messages
		Communicate::communicateToUsers([$user1, $user2], new ProjectSettingsModel($projectId), "subject!", "message!", "message!", new MockCommunicateDelivery());
		
		$dto = ProjectPageDto::encode($projectId, $user1Id);

		// text list check
		$this->assertIsa($dto['texts'], 'array');
		$this->assertEqual($dto['texts'][0]['id'], $text1Id);
		$this->assertEqual($dto['texts'][1]['id'], $text2Id);
		$this->assertEqual($dto['texts'][0]['title'], "Chapter 3");
		$this->assertEqual($dto['texts'][1]['title'], "Chapter 4");
		$this->assertEqual($dto['texts'][0]['questionCount'], 2);
		$this->assertEqual($dto['texts'][1]['questionCount'], 1);
		
		
		// member list check
		$this->assertIsa($dto['members'], 'array');
		$this->assertEqual($dto['members'][0]['username'], "jcarter");
		$this->assertEqual($dto['members'][1]['username'], "dthoris");
		
		// message list check
		$this->assertIsA($dto['messages']['items'], 'array');
		$this->assertEqual($dto['messages']['items'][0]['subject'], 'subject!');
		$this->assertEqual($dto['messages']['unreadCount'], 1);
		
		// activity feed check
		$this->assertIsa($dto['activity']['items'], 'array');
		$this->assertEqual($dto['activity']['unreadCount'], 2);

	}

}

?>
