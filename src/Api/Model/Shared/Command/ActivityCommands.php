<?php

namespace Api\Model\Shared\Command;

use Api\Model\Languageforge\Lexicon\Command\LexEntryCommands;
use Api\Model\Languageforge\Lexicon\LexCommentModel;
use Api\Model\Languageforge\Lexicon\LexCommentReply;
use Api\Model\Languageforge\Lexicon\LexEntryModel;
use Api\Model\Scriptureforge\Sfchecks\AnswerModel;
use Api\Model\Scriptureforge\Sfchecks\QuestionModel;
use Api\Model\Scriptureforge\Sfchecks\TextModel;
use Api\Model\Scriptureforge\Sfchecks\UnreadTextModel;
use Api\Model\Shared\ActivityModel;
use Api\Model\Shared\CommentModel;
use Api\Model\Shared\ProjectModel;
use Api\Model\Shared\UserModel;
use Api\Model\Shared\UnreadActivityModel;
use Api\Model\Shared\UnreadAnswerModel;
use Api\Model\Shared\UnreadCommentModel;
use Api\Model\Shared\UnreadLexCommentModel;
use Api\Model\Shared\UnreadLexReplyModel;
use Api\Model\Shared\UnreadQuestionModel;

class ActivityCommands
{
    /**
     *
     * @param ProjectModel $projectModel
     * @param string $questionId
     * @param string $answerId
     * @param CommentModel $commentModel
     * @param string $mode
     * @return string activity id
     */
    public static function updateCommentOnQuestion($projectModel, $questionId, $answerId, $commentModel, $mode = "update")
    {
        $activity = new ActivityModel($projectModel);
        $question = new QuestionModel($projectModel, $questionId);
        $answer = $question->readAnswer($answerId);
        $text = new TextModel($projectModel, $question->textRef->asString());
        $user = new UserModel($commentModel->userRef->asString());
        $user2 = new UserModel($answer->userRef->asString());
        $activity->action = ($mode == 'update') ? ActivityModel::UPDATE_COMMENT : ActivityModel::ADD_COMMENT;
        $activity->userRef->id = $commentModel->userRef->asString();
        $activity->userRef2->id = $answer->userRef->asString();
        $activity->textRef->id = $text->id->asString();
        $activity->questionRef->id = $questionId;
        $activity->addContent(ActivityModel::TEXT, $text->title);
        $activity->addContent(ActivityModel::ANSWER, $answer->content);
        $activity->addContent(ActivityModel::QUESTION, $question->getTitleForDisplay());
        $activity->addContent(ActivityModel::COMMENT, $commentModel->content);
        $activity->addContent(ActivityModel::USER, $user->username);
        $activity->addContent(ActivityModel::USER2, $user2->username);
        $activityId = $activity->write();
        UnreadActivityModel::markUnreadForProjectMembers($activityId, $projectModel);
        UnreadCommentModel::markUnreadForProjectMembers($commentModel->id->asString(), $projectModel, $questionId, $commentModel->userRef->asString());

        return $activityId;
    }

    public static function addCommentOnQuestion($projectModel, $questionId, $answerId, $commentModel)
    {
        return ActivityCommands::updateCommentOnQuestion($projectModel, $questionId, $answerId, $commentModel, "add");
    }

    /**
     *
     * @param ProjectModel $projectModel
     * @param string $questionId
     * @param AnswerModel $answerModel
     * @param string $mode
     * @return string activity id
     */
    public static function updateAnswer($projectModel, $questionId, $answerModel, $mode = "update")
    {
        $activity = new ActivityModel($projectModel);
        $question = new QuestionModel($projectModel, $questionId);
        $text = new TextModel($projectModel, $question->textRef->asString());
        $user = new UserModel($answerModel->userRef->asString());

        $activity->action = ($mode == "update") ? ActivityModel::UPDATE_ANSWER : ActivityModel::ADD_ANSWER;
        $activity->userRef->id = $answerModel->userRef->asString();
        $activity->textRef->id = $text->id->asString();
        $activity->questionRef->id = $questionId;
        $activity->addContent(ActivityModel::TEXT, $text->title);
        $activity->addContent(ActivityModel::QUESTION, $question->getTitleForDisplay());
        $activity->addContent(ActivityModel::ANSWER, $answerModel->content);
        $activity->addContent(ActivityModel::USER, $user->username);
        $activityId = $activity->write();
        UnreadActivityModel::markUnreadForProjectMembers($activityId, $projectModel);
        UnreadAnswerModel::markUnreadForProjectMembers($answerModel->id->asString(), $projectModel, $questionId, $answerModel->userRef->asString());

        return $activityId;
    }

    public static function addAnswer($projectModel, $questionId, $answerModel)
    {
        return ActivityCommands::updateAnswer($projectModel, $questionId, $answerModel, 'add');
    }

    /**
     *
     * @param ProjectModel $projectModel
     * @param string $textId
     * @param TextModel $textModel
     * @return string activity id
     */
    public static function addText($projectModel, $textId, $textModel)
    {
        $activity = new ActivityModel($projectModel);
        $activity->action = ActivityModel::ADD_TEXT;
        $activity->textRef->id = $textId;
        $activity->addContent(ActivityModel::TEXT, $textModel->title);
        $activityId = $activity->write();
        UnreadActivityModel::markUnreadForProjectMembers($activityId, $projectModel);
        UnreadTextModel::markUnreadForProjectMembers($textId, $projectModel);

        return $activityId;
    }

    /**
     * @param ProjectModel $projectModel
     * @param string $questionId
     * @param QuestionModel $questionModel
     * @return string activity id
     */
    public static function addQuestion($projectModel, $questionId, $questionModel)
    {
        $activity = new ActivityModel($projectModel);
        $text = new TextModel($projectModel, $questionModel->textRef->asString());
        $activity->action = ActivityModel::ADD_QUESTION;
        $activity->textRef->id = $questionModel->textRef->asString();
        $activity->questionRef->id = $questionId;
        $activity->addContent(ActivityModel::TEXT, $text->title);
        $activity->addContent(ActivityModel::QUESTION, $questionModel->getTitleForDisplay());
        $activityId = $activity->write();
        UnreadActivityModel::markUnreadForProjectMembers($activityId, $projectModel);
        UnreadQuestionModel::markUnreadForProjectMembers($questionId, $projectModel);

        return $activityId;
    }

    /**
     *
     * @param ProjectModel $projectModel
     * @param string $userId
     * @return string activity id
     */
    public static function addUserToProject($projectModel, $userId)
    {
        $activity = new ActivityModel($projectModel);
        $activity->action = ActivityModel::ADD_USER_TO_PROJECT;
        $activity->userRef->id = $userId; // we can use the userRef in this case because we don't keep track of the user that performed this action
        $user = new UserModel($userId);
        $activity->addContent(ActivityModel::USER, $user->username);
        $activityId = $activity->write();
        UnreadActivityModel::markUnreadForProjectMembers($activityId, $projectModel);

        return $activityId;
    }

    // this may only be useful to log this activity for answers on which the user has commented on or has answered him/herself
    // TODO: how do we implement this?
    /**
     *
     * @param ProjectModel $projectModel
     * @param string $questionId
     * @param string $answerId
     * @param string $userId
     * @param string $mode
     * @return string activity id
     */
    public static function updateScore($projectModel, $questionId, $answerId, $userId, $mode = 'increase')
    {
        $question = new QuestionModel($projectModel, $questionId);
        $text = new TextModel($projectModel, $question->textRef->asString());
        $answer = $question->answers[$answerId];
        $user = new UserModel($userId);
        $user2 = new UserModel($answer->userRef->asString());
        $activity = new ActivityModel($projectModel);
        $activity->action = ($mode == 'increase') ? ActivityModel::INCREASE_SCORE : ActivityModel::DECREASE_SCORE;
        $activity->userRef->id = $userId;
        $activity->textRef->id = $text->id->asString();
        $activity->questionRef->id = $questionId;
        $activity->addContent(ActivityModel::TEXT, $text->title);
        $activity->addContent(ActivityModel::QUESTION, $question->getTitleForDisplay());
        $activity->addContent(ActivityModel::ANSWER, $answer->content);
        $activity->addContent(ActivityModel::USER, $user->username);
        $activity->addContent(ActivityModel::USER, $user2->username);
        $activityId = $activity->write();
        UnreadActivityModel::markUnreadForProjectMembers($activityId, $projectModel);

        return $activityId;
    }

    /**
     *
     * @param ProjectModel $projectModel
     * @param string $userId
     * @param LexEntryModel $entry
     * @param string $action
     * @param array $actionContent
     * @return string activity id
     */
    public static function writeEntry($projectModel, $userId, $entry, $action, $actionContent = null)
    {
        $activity = new ActivityModel($projectModel);
        $activity->entryRef->id = $entry->id->asString();
        $user = new UserModel($userId);
        $activity->userRef->id = $userId;
        if ($action == 'update') {
            $activity->action = ActivityModel::UPDATE_ENTRY;
            $title = LexEntryCommands::getEntryLexeme($projectModel->id->asString(), $entry->id->asString());
        } else {
            $activity->action = ActivityModel::ADD_ENTRY;
            try {
                $title = LexEntryCommands::getEntryLexeme($projectModel->id->asString(), $entry->id->asString());
            } catch (\Exception $ex) {
                $title = '';
            }
        }

        $activity->addContent(ActivityModel::ENTRY, $title);
        $activity->addContent(ActivityModel::USER, $user->username);

        if (isset($actionContent)) {
            foreach ($actionContent as $type => $content) {
                $activity->addContent($type, $content);
            }
        }

        return $activity->write();
    }

    /**
     *
     * @param ProjectModel $projectModel
     * @param string $userId
     * @param string $id entry id
     * @return string activity id
     */
    public static function deleteEntry($projectModel, $userId, $id)
    {
        $activity = new ActivityModel($projectModel);
        $activity->userRef->id = $userId;
        $activity->action = ActivityModel::DELETE_ENTRY;

        $lexeme = LexEntryCommands::getEntryLexeme($projectModel->id->asString(), $id);
        $activity->addContent(ActivityModel::ENTRY, $lexeme);

        return $activity->write();
    }

    /**
     * @param ProjectModel $projectModel
     * @param string $entryId
     * @param LexCommentModel $commentModel
     * @param string $mode
     * @return string activity id
     * @throws \Exception
     */
    public static function updateCommentOnEntry($projectModel, $entryId, $commentModel, $mode = "update")
    {
        $activity = new ActivityModel($projectModel);
        $entry = new LexEntryModel($projectModel, $entryId);
        if ($mode === 'update') {
            $userId = $commentModel->authorInfo->modifiedByUserRef->asString();
        } else {
            $userId = $commentModel->authorInfo->createdByUserRef->asString();
        }
        $user = new UserModel($userId);
        $activity->action = ($mode == 'update') ? ActivityModel::UPDATE_LEX_COMMENT : ActivityModel::ADD_LEX_COMMENT;
        $activity->userRef->id = $userId;
        $activity->entryRef->id = $entryId;
        $activity->addContent(ActivityModel::ENTRY, $entry->nameForActivityLog());
        $activity->addContent(ActivityModel::LEX_COMMENT, $commentModel->content);
        $activity->addContent(ActivityModel::LEX_COMMENT_CONTEXT, $commentModel->contextGuid);
        $activity->addContent(ActivityModel::USER, $user->username);
        $activityId = $activity->write();
        UnreadActivityModel::markUnreadForProjectMembers($activityId, $projectModel);
        UnreadLexCommentModel::markUnreadForProjectMembers($commentModel->id->asString(), $projectModel, $entryId, $userId);

        return $activityId;
    }

    /**
     * @param ProjectModel $projectModel
     * @param string $entryId
     * @param LexCommentModel $commentModel
     * @return string activity id
     * @throws \Exception
     */
    public static function addCommentOnEntry($projectModel, $entryId, $commentModel)
    {
        return ActivityCommands::updateCommentOnEntry($projectModel, $entryId, $commentModel, "add");
    }

    /**
     * @param ProjectModel $projectModel
     * @param string $entryId
     * @param LexCommentModel $commentModel
     * @return string activity id
     * @throws \Exception
     */
    public static function updateEntryCommentStatus($projectModel, $entryId, $commentModel)
    {
        $activity = new ActivityModel($projectModel);
        $entry = new LexEntryModel($projectModel, $entryId);
        $userId = $commentModel->authorInfo->modifiedByUserRef->asString();
        $user = new UserModel($userId);
        $activity->action = ActivityModel::UPDATE_LEX_COMMENT_STATUS;
        $activity->userRef->id = $userId;
        $activity->entryRef->id = $entryId;
        $activity->addContent(ActivityModel::ENTRY, $entry->nameForActivityLog());
        $activity->addContent(ActivityModel::LEX_COMMENT, $commentModel->content);
        $activity->addContent(ActivityModel::LEX_COMMENT_CONTEXT, $commentModel->contextGuid);
        $activity->addContent(ActivityModel::LEX_COMMENT_STATUS, $commentModel->status);
        $activity->addContent(ActivityModel::USER, $user->username);
        $activityId = $activity->write();
        UnreadActivityModel::markUnreadForProjectMembers($activityId, $projectModel);
        UnreadLexCommentModel::markUnreadForProjectMembers($commentModel->id->asString(), $projectModel, $entryId, $userId);

        return $activityId;
    }

    /**
     * @param ProjectModel $projectModel
     * @param string $entryId
     * @param LexCommentModel $commentModel
     * @param LexCommentReply $replyModel
     * @param string $mode
     * @return string activity id
     * @throws \Exception
     */
    public static function updateReplyToEntryComment($projectModel, $entryId, $commentModel, $replyModel, $mode = "update")
    {
        if ($mode === 'update') {
            $userId = $commentModel->authorInfo->modifiedByUserRef->asString();
        } else {
            $userId = $commentModel->authorInfo->createdByUserRef->asString();
        }
        if ($mode === 'update') {
            $user2Id = $replyModel->authorInfo->modifiedByUserRef->asString();
        } else {
            $user2Id = $replyModel->authorInfo->createdByUserRef->asString();
        }
        $user = new UserModel($userId);
        $user2 = new UserModel($user2Id);
        $activity = new ActivityModel($projectModel);
        $activity->action = ($mode == 'update') ? ActivityModel::UPDATE_LEX_REPLY : ActivityModel::ADD_LEX_REPLY;
        $activity->userRef->id = $userId;
        $activity->userRef2->id = $user2Id;
        $activity->entryRef->id = $entryId;
        $entry = new LexEntryModel($projectModel, $entryId);
        $activity->addContent(ActivityModel::ENTRY, $entry->nameForActivityLog());
        $activity->addContent(ActivityModel::LEX_COMMENT, $commentModel->content);
        $activity->addContent(ActivityModel::LEX_COMMENT_CONTEXT, $commentModel->contextGuid);
        $activity->addContent(ActivityModel::LEX_REPLY, $replyModel->content);
        $activity->addContent(ActivityModel::USER, $user->username);
        $activity->addContent(ActivityModel::USER2, $user2->username);
        $activityId = $activity->write();
        UnreadActivityModel::markUnreadForProjectMembers($activityId, $projectModel);
        // Disabling the "mark replies as unread" feature until "unread items" system is revamped. - RM 2018-03
        // (Can't mark things unread unless they have a MongoID, and LexCommentReplies just have a PHP "uniqid". But changing that would have knock-on effects in LfMerge.)
        // UnreadLexReplyModel::markUnreadForProjectMembers($replyModel->id, $projectModel, $entryId, $userId);

        return $activityId;
    }

    /**
     * @param ProjectModel $projectModel
     * @param string $entryId
     * @param LexCommentModel $commentModel
     * @param LexCommentReply $replyModel
     * @return string activity id
     * @throws \Exception
     */
    public static function addReplyToEntryComment($projectModel, $entryId, $commentModel, $replyModel)
    {
        return ActivityCommands::updateReplyToEntryComment($projectModel, $entryId, $commentModel, $replyModel, "add");
    }
}
