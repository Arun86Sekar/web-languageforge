'use strict';

angular.module('userprofile', ['ui.bootstrap', 'bellows.services', 'palaso.ui.notice',
  'pascalprecht.translate', 'palaso.ui.intlTelInput'])
  .config(['$translateProvider', function ($translateProvider) {
    // configure interface language filepath
    $translateProvider.useStaticFilesLoader({
      prefix: '/angular-app/bellows/lang/',
      suffix: '.json'
    });
    $translateProvider.preferredLanguage('en');
    $translateProvider.useSanitizeValueStrategy('escape');

  }])
  .controller('userProfileCtrl', ['$scope', 'userService', 'utilService',
    'silNoticeService', 'modalService', '$window',
  function ($scope, userService, util, notice, modalService, $window) {
    $scope.getAvatarUrl = util.getAvatarUrl;

    function getAvatarRef(color, shape) {
      if (!color || !shape) {
        return 'anonymoose.png';
      }

      return color + '-' + shape + '-128x128.png';
    }

    var initColor;
    var initShape;
    $scope.emailValid = true;
    $scope.usernameValid = true;

    $scope.user = { };
    $scope.user.avatar_ref = getAvatarRef('', '');

    $scope.$watch('user.avatar_color', function () {
      $scope.user.avatar_ref = getAvatarRef($scope.user.avatar_color, $scope.user.avatar_shape);
    });

    $scope.$watch('user.avatar_shape', function () {
      $scope.user.avatar_ref = getAvatarRef($scope.user.avatar_color, $scope.user.avatar_shape);
    });

    $scope.validateForm = function () {
      $scope.emailValid = $scope.userprofileForm.email.$pristine ||
        ($scope.userprofileForm.email.$dirty && !$scope.userprofileForm.$error.email);

      $scope.usernameValid = $scope.userprofileForm.username.$pristine ||
        ($scope.userprofileForm.username.$dirty && !$scope.userprofileForm.$error.username);

      userService.checkUniqueIdentity($scope.user.id, $scope.user.username, $scope.user.email,
        function (result) {
        if (result.ok) {
          switch (result.data) {
            case 'usernameExists' :
              $scope.usernameExists = true;
              $scope.emailExists = false;
              $scope.takenUsername = $scope.user.username.toLowerCase();
              $scope.userprofileForm.username.$setPristine();
              break;
            case 'emailExists' :
              $scope.usernameExists = false;
              $scope.emailExists = true;
              $scope.takenEmail = $scope.user.email.toLowerCase();
              $scope.userprofileForm.email.$setPristine();
              break;
            case 'usernameAndEmailExists' :
              $scope.usernameExists = true;
              $scope.emailExists = true;
              $scope.takenUsername = $scope.user.username.toLowerCase();
              $scope.takenEmail = $scope.user.email.toLowerCase();
              $scope.userprofileForm.username.$setPristine();
              $scope.userprofileForm.email.$setPristine();
              break;
            default:
              $scope.usernameExists = false;
              $scope.emailExists = false;
          }
        }
      });
    };

    function loadUser() {
      userService.readProfile(function (result) {
        if (result.ok) {
          $scope.user = result.data.userProfile;
          $scope.originalUsername = $scope.user.username;
          if (!$scope.user.avatar_color) delete $scope.user.avatar_color;
          if (!$scope.user.avatar_shape) delete $scope.user.avatar_shape;
          initColor = $scope.user.avatar_color;
          initShape = $scope.user.avatar_shape;
          $scope.projectsSettings = result.data.projectsSettings;

          // populate the project pickList default values with the userProfile picked values
          for (var i = 0; i < $scope.projectsSettings.length; i++) {
            var project = $scope.projectsSettings[i];
            if (project.userProperties && project.userProperties.userProfilePickLists) {
              angular.forEach(project.userProperties.userProfilePickLists,
                function (pickList, pickListId) {
                  // ensure user has profile data
                  if ($scope.user.projectUserProfiles[project.id]) {
                    if ($scope.user.projectUserProfiles[project.id][pickListId])
                      $scope.projectsSettings[i].userProperties.userProfilePickLists[pickListId]
                        .defaultKey = $scope.user.projectUserProfiles[project.id][pickListId];
                  }
                }
              );
            }
          }
        }
      });
    }

    $scope.submit = function () {
      if ($scope.user.username !== $scope.originalUsername) {
        // Confirmation for username change
        var message = 'Changing Username from <b>' + $scope.originalUsername + '</b> to <b>' +
          $scope.user.username + '</b> will force you to login again.<br /><br />' +
          'Do you want to save changes?';
        var modalOptions = {
          closeButtonText: 'Cancel',
          actionButtonText: 'Save changes',
          headerText: 'Changing username?',
          bodyText: message
        };
        modalService.showModal({}, modalOptions).then(function () {
          $scope.updateUser();

          // catch is necessary to properly implement promise API, which angular 1.6 complains if
          // we don't have a catch
        }).catch(function (error) {});
      } else {
        $scope.updateUser();
      }
    };

    $scope.updateUser = function () {

      // populate the userProfile picked values from the project pickLists
      for (var i = 0; i < $scope.projectsSettings.length; i++) {
        var project = $scope.projectsSettings[i];
        $scope.user.projectUserProfiles[project.id] = {};
        if (project.userProperties && project.userProperties.userProfilePickLists) {
          angular.forEach(project.userProperties.userProfilePickLists,
            function (pickList, pickListId) {
              $scope.user.projectUserProfiles[project.id][pickListId] = pickList.defaultKey;
            }
          );
        }
      }

      userService.updateProfile($scope.user, function (result) {
        if (result.ok) {
          if ($scope.user.avatar_color !== initColor || $scope.user.avatar_shape !== initShape) {
            var newAvatarUrl = $scope.getAvatarUrl($scope.user.avatar_ref);
            ['mobileSmallAvatarURL', 'smallAvatarURL'].forEach(function (id) {
              $window.document.getElementById(id).src = newAvatarUrl;
            });
          }

          if (result.data === 'login') {
            notice.push(notice.SUCCESS, 'Username changed. Please login.');
            $window.location.href = '/auth/logout';
          } else {
            notice.push(notice.SUCCESS, 'Profile updated successfully');
          }
        }
      });
    };

    loadUser(); // load the user data right away

    $scope.dropdown = {};

    $scope.dropdown.avatarColors = [
      { value: 'purple4', label: 'Purple' },
      { value: 'green', label: 'Green' },
      { value: 'chocolate4', label: 'Chocolate' },
      { value: 'turquoise4', label: 'Turquoise' },
      { value: 'LightSteelBlue4', label: 'Steel Blue' },
      { value: 'DarkOrange', label: 'Dark Orange' },
      { value: 'HotPink', label: 'Hot Pink' },
      { value: 'DodgerBlue', label: 'Blue' },
      { value: 'plum', label: 'Plum' },
      { value: 'red', label: 'Red' },
      { value: 'gold', label: 'Gold' },
      { value: 'salmon', label: 'Salmon' },
      { value: 'DarkGoldenrod3', label: 'Dark Golden' },
      { value: 'chartreuse', label: 'Chartreuse' },
      { value: 'LightBlue', label: 'Light Blue' },
      { value: 'LightYellow', label: 'Light Yellow' }
    ];

    $scope.dropdown.avatarShapes = [
      { value: 'camel', label: 'Camel' },
      { value: 'cow', label: 'Cow' },
      { value: 'dog', label: 'Dog' },
      { value: 'elephant', label: 'Elephant' },
      { value: 'frog', label: 'Frog' },
      { value: 'gorilla', label: 'Gorilla' },
      { value: 'hippo', label: 'Hippo' },
      { value: 'horse', label: 'Horse' },
      { value: 'kangaroo', label: 'Kangaroo' },
      { value: 'mouse', label: 'Mouse' },
      { value: 'otter', label: 'Otter' },
      { value: 'pig', label: 'Pig' },
      { value: 'rabbit', label: 'Rabbit' },
      { value: 'rhino', label: 'Rhino' },
      { value: 'sheep', label: 'Sheep' },
      { value: 'tortoise', label: 'Tortoise' }
    ];

  }])

  ;
