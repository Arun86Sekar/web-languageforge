<?php

namespace libraries\shared\scripts\migration;

use models\commands\ProjectCommands;
use models\mapper\Id;
use models\ProjectModel;
use models\QuestionModel;
use models\TextListModel;
use models\TextModel;
require_once APPPATH . 'models/TextModel.php';

class CopySfJamaicanPsalmsProject
{
    public function run($mode = 'test')
    {
        $testMode = ($mode != 'run');
        $message = "Copy SF Jamaican Psalms Project\n\n";

        $projectCodeJP = 'jamaican_psalms';
        $project = $this->getProjectByCode($projectCodeJP);
        if (!$project) {
            $message .= "Project to copy doesn't exist.\n";
            return $message;
        }

        $projectCodeCopy = $projectCodeJP . '_copy';
        if (ProjectCommands::projectCodeExists($projectCodeCopy)) {
            $message .= "Copied Project already exists.\n";
            return $message;
        }

        $projectCopy = clone $project;
        $projectCopy->id = new Id();
        $projectCopy->projectCode = $projectCodeCopy;
        $projectCopy->projectName .= ' (copy)';
        if (!$testMode) {
            $message .= "  Saving copied project '$projectCopy->projectName'.\n\n";
            $projectCopy->write();
        }

        $textsExamined = 0;
        $textsUpdated = 0;
        $textList = new TextListModel($project);
        $textList->read();

        // foreach text in project
        foreach ($textList->entries as $textParams) {
            $textsExamined++;
            $textId = $textParams['id'];
            $text = new TextModel($project, $textId);
            $textCopy = new TextModel($projectCopy);
            $textCopy->title = $text->title;
            $textCopy->audioFileName = $text->audioFileName;
            $textCopy->content = $text->content;
            $textCopy->isArchived = $text->isArchived;

            $questionsList = $text->listQuestions();
            foreach ($questionsList->entries as $questionParams) {
                $questionId = $questionParams['id'];
                $question = new QuestionModel($project, $questionId);
                $questionCopy = new QuestionModel($projectCopy);
                foreach ($question as $field => $value) {
                    if ($field != 'id' && $field != 'answers') {
                        $questionCopy->{$field} = $question->{$field};
                    }
                }

                // copy Answers
                foreach ($question->answers as $answerId => $answer) {

                    // Copy Comments
                    foreach ($answer->comments as $commentId => $comment) {

                    }
                }

                if (!$testMode) {
                    $questionCopy->write();
                }
            }

            if (!$testMode) {
                $textCopy->write();
                $textsUpdated++;
            }
            $message .= "Copied text: $text->title\n";
        }

        // Copy Assets

        return $message;
    }

    /**
     *
     * @param string $code
     * @return ProjectModel
     */
    private function getProjectByCode($code)
    {
        $project = new ProjectModel();
        if ($project->readByProperties(array('projectCode' => $code))) {
            return ProjectModel::getById($project->id->asString());
        } else {
            return null;
        }
    }
}
