import * as angular from 'angular';

import { ActivityService } from './api/activity.service';
import { ApiService } from './api/api.service';
import { JsonRpcModule } from './api/json-rpc.service';
import { ProjectService } from './api/project.service';
import { RestApiService } from './api/rest-api.service';
import { UserRestApiService } from './api/user-rest-api.service';
import { UserService } from './api/user.service';
import { ApplicationHeaderService } from './application-header.service';
import { BreadcrumbService } from './breadcrumbs/breadcrumb.service';
import {BytesFilter, EncodeURIFilter, RelativeTimeFilter} from './filters';
import { LinkService } from './link.service';
import { ModalService } from './modal/modal.service';
import { OfflineModule } from './offline/offline.module';
import { SessionService } from './session.service';
import { UtilityService } from './utility.service';

export const CoreModule = angular
  .module('coreModule', [JsonRpcModule, OfflineModule])
  .service('projectService', ProjectService)
  .service('userService', UserService)
  .service('activityService', ActivityService)
  .service('apiService', ApiService)
  .service('sessionService', SessionService)
  .service('modalService', ['$uibModal', ModalService])
  .service('linkService', LinkService)
  .service('applicationHeaderService', () => {
    // Share the service in the window scope so that it is accessible from any app to share data
    // The top navigation bar is independent of all the other angular apps
    // This service allows any app to manipulate the header area i.e. page name, breadcrumbs, etc...
    if (!angular.isDefined(( window as any ).sharedApplicationHeaderService) ||
      ( window as any ).sharedApplicationHeaderService === null) {
      ( window as any ).sharedApplicationHeaderService = new ApplicationHeaderService(new BreadcrumbService());
    }

    return ( window as any ).sharedApplicationHeaderService;
  })
  .service('utilService', UtilityService)
  .service('restApiService', RestApiService)
  .service('userRestApiService', UserRestApiService)
  .filter('bytes', BytesFilter)
  .filter('relativetime', RelativeTimeFilter)
  .filter('encodeURI', ['$window', EncodeURIFilter])
  .name;
