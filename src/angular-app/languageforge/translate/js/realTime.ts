
// LanguageForge Real-Time Client Service
angular.module('realTime', [])
  .value('realTime', require('../../../../node/client').realTime);