'use strict';

angular.module('webtypesetting.services', ['jsonRpc'])
  .service('webtypesettingEditService', ['jsonRpc',
  function(jsonRpc) {
    jsonRpc.connect('/api/sf');
    this.render = function render(callback){
    	jsonRpc.call("webtypesetting_rapuma_render", [], callback);
    };
    this.editorDto = function(callback) {
    }; 
    

  }])
  .service('webtypesettingSetupService', ['jsonRpc',
  function(jsonRpc) {
    jsonRpc.connect('/api/sf');
    
	
    this.setupPageDto = function(callback) {
    }; 
    
  }])
  .service('webtypesettingAssetService', ['jsonRpc',
  function(jsonRpc) {
	  jsonRpc.connect('/api/sf');
	  
	  this.add = function(callback) {
	  };
  }])
  ;
