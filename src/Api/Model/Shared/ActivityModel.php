<?php

namespace Api\Model\Shared;

use Api\Model\Shared\Mapper\Id;
use Api\Model\Shared\Mapper\IdReference;
use Api\Model\Shared\Mapper\MapperModel;
use Api\Model\Shared\Mapper\MapOf;
use Palaso\Utilities\CodeGuard;

class ActivityModel extends MapperModel
{
    // constants describing Actions
    const ADD_COMMENT = 'add_comment';
    const UPDATE_COMMENT = 'update_comment';
    const ADD_ANSWER = 'add_answer';
    const UPDATE_ANSWER = 'update_answer';
    const ADD_TEXT = 'add_text';
    const ADD_QUESTION = 'add_question';
    const CHANGE_STATE_OF_QUESTION = 'change_state_of_question';
    const INCREASE_SCORE = 'increase_score';
    const DECREASE_SCORE = 'decrease_score';
    const ADD_USER_TO_PROJECT = 'add_user_to_project';
    const UNKNOWN = 'unknown';
    const ADD_ENTRY = 'add_entry';
    const UPDATE_ENTRY = 'update_entry';
    const DELETE_ENTRY = 'delete_entry';
    const ADD_LEX_COMMENT = 'add_lex_comment';
    const UPDATE_LEX_COMMENT = 'update_lex_comment';
    const UPDATE_LEX_COMMENT_STATUS = 'update_lex_comment_status';
    const ADD_LEX_REPLY = 'add_lex_reply';
    const UPDATE_LEX_REPLY = 'update_lex_reply';

    // content types for use with the addContent method
    const PROJECT = 'project';
    const TEXT = 'text';
    const QUESTION = 'question';
    const ANSWER = 'answer';
    const COMMENT = 'comment';
    const LEX_COMMENT = 'lexComment';
    const LEX_COMMENT_CONTEXT = 'lexCommentContext';
    const LEX_COMMENT_STATUS = 'lexCommentStatus';
    const LEX_REPLY = 'lexReply';
    const USER = 'user';
    const USER2 = 'user2';
    const ENTRY = 'entry';

    /**
     * @param ProjectModel $projectModel
     * @param string $id
     */
    public function __construct($projectModel, $id = '')
    {
        $this->id = new Id();
        $this->projectRef = new IdReference($projectModel->id->asString());
        $this->textRef = new IdReference();
        $this->questionRef = new IdReference();
        $this->userRef = new IdReference();
        $this->userRef2 = new IdReference();
        $this->entryRef = new IdReference();
        $this->action = $this::UNKNOWN;
        $this->date = new \DateTime(); // set the timestamp to now
        $this->actionContent = new MapOf(); // strings
        $this->addContent($this::PROJECT, $projectModel->projectName);
        $databaseName = $projectModel->databaseName();
        parent::__construct(ActivityModelMongoMapper::connect($databaseName), $id);
    }

    // TODO add a userFilter ArrayOf type that we can use to query Mongo for activities that only apply to specific users

    /** @var Id */
    public $id;

    /** @var IdReference */
    public $projectRef;

    /** @var IdReference */
    public $textRef;

    /** @var IdReference */
    public $questionRef;

    /** @var IdReference */
    public $userRef;

    /** @var IdReference */
    public $userRef2;

    /** @var IdReference */
    public $entryRef;

    /** @var string */
    // TODO add broadcast_message as an action on a GlobalActivityModel class cjh 2013-08
    public $action;

    /** @var MapOf<string> */
    public $actionContent;

    /** @var \DateTime */
    public $date;

    /**
     * @param string $type - this is one of
     * @param string $content
     */
    public function addContent($type, $content)
    {
        if (is_null($content)) return;  // Just ignore null content instead of throwing an exception
        CodeGuard::checkTypeAndThrow($content, 'string');
        $this->actionContent[$type] = $content;
    }
}
