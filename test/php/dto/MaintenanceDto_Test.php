<?php

use models\dto\MaintenanceDto;
use models\UserModel;
use models\rights\Roles;

require_once(dirname(__FILE__) . '/../TestConfig.php');
require_once(SimpleTestPath . 'autorun.php');
require_once(TestPath . 'common/MongoTestEnvironment.php');

class TestMaintenanceDto extends UnitTestCase {

	function testEncode_UserOf1Project2Projects_DtoReturnsProjectCount1UserCount0() {
		$e = new MongoTestEnvironment();
		$e->clean();
		
		$userId = $e->createUser("user", "Name", "name@example.com");
		$user = new UserModel($userId);
		$user->role = Roles::USER;
		$user->write();
			
		$project1Name = SF_TESTPROJECT;
		$project1 = $e->createProject($project1Name);
		$projectId1 = $project1->id->asString();
		$project1->addUser($userId, Roles::USER);
		$project1->write();
		
		$project2Name = SF_TESTPROJECT2;
		$project2 = $e->createProject($project2Name);
		$projectId2 = $project2->id->asString();
		
		$dto = MaintenanceDto::encode($userId);
		
		$this->assertEqual($dto['projectList']['count'], 1);
		$this->assertIsA($dto['projectList']['entries'], 'array');
		$this->assertEqual($dto['projectList']['entries'][0]['id'], $projectId1);
		$this->assertEqual($dto['projectList']['entries'][0]['projectname'], $project1Name);
		$this->assertEqual($dto['userList']['count'], 0);
	}

	function testEncode_SiteAdmin2Projects_DtoReturnsProjectCount2UserCount2() {
		$e = new MongoTestEnvironment();
		$e->clean();
		
		$adminId = $e->createUser("admin", "Admin Name", "admin@example.com");
		$admin = new UserModel($adminId);
		$admin->role = Roles::SYSTEM_ADMIN;
		$admin->write();
		
		$userId = $e->createUser("user", "Name", "name@example.com");
		$user = new UserModel($userId);
		$user->role = Roles::USER;
		$user->write();
		
		$project1Name = SF_TESTPROJECT;
		$project1 = $e->createProject($project1Name);
		$projectId1 = $project1->id->asString();
		$project1->addUser($adminId, Roles::USER);
		$project1->write();
		
		$project2Name = SF_TESTPROJECT2;
		$project2 = $e->createProject($project2Name);
		$projectId2 = $project2->id->asString();
		
		$dto = MaintenanceDto::encode($adminId);
		echo "<pre>";
		var_dump($dto['projectList']);
		var_dump($dto['userList']);
		echo "</pre>";
		
		$this->assertEqual($dto['projectList']['count'], 2);
		$this->assertIsA($dto['projectList']['entries'], 'array');
		$this->assertEqual($dto['projectList']['entries'][0]['id'], $projectId1);
		$this->assertEqual($dto['projectList']['entries'][0]['projectname'], $project1Name);
		$this->assertEqual($dto['projectList']['entries'][1]['id'], $projectId2);
		$this->assertEqual($dto['projectList']['entries'][1]['projectname'], $project2Name);
		$this->assertEqual($dto['userList']['count'], 2);
		$this->assertIsA($dto['userList']['entries'], 'array');
		$this->assertEqual($dto['userList']['entries'][0]['id'], $adminId);
		$this->assertEqual($dto['userList']['entries'][0]['username'], "admin");
		$this->assertEqual($dto['userList']['entries'][1]['id'], $userId);
		$this->assertEqual($dto['userList']['entries'][1]['username'], "user");
	}
	
}

?>
