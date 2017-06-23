'use strict';

angular.module('lexicon.services')

// Lexicon Link Service
.service('lexLinkService', ['$location', 'sessionService', function ($location, ss) {
  this.projectUrl = function projectUrl() {
    return '/app/lexicon/' + this.getProjectId() + '#!/';
  };

  this.projectView = function projectView(view) {
    return this.projectUrl() + view;
  };

  this.getProjectId = function getProjectId() {
    return ss.projectId();
  };
}]);

