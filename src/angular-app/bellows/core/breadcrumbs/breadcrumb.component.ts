import * as angular from 'angular';

import { ApplicationHeaderService } from '../application-header.service';
import { BreadcrumbService, Crumb } from './breadcrumb.service';

export class BreadcrumbController implements angular.IController {
  id: string;

  breadcrumbs: Crumb[];

  static $inject: string[] = ['$scope', 'applicationHeaderService'];
  constructor(private $scope: angular.IScope, private applicationHeaderService: ApplicationHeaderService) {
    $scope.$watch(() => applicationHeaderService.breadcrumbService.get(this.id), (breadcrumbs: Crumb[]) => {
      this.resetCrumbs(breadcrumbs);
    }, true);
  }

  unregisterBreadCrumb = function(index: number) {
    this.breadcrumbService.setLastIndex(this.id, index);
  };

  private resetCrumbs(breadcrumbs: Crumb[]) {
    this.breadcrumbs = [];
    for (const crumb of breadcrumbs) {
      this.breadcrumbs.push(crumb);
    }
  }

}

export const BreadcrumbComponent: angular.IComponentOptions = {
  bindings: {
    id: '@'
  },
  controller: BreadcrumbController,
  template: `
    <ol class="breadcrumb">
        <li class="breadcrumb-item" data-ng-repeat="bc in $ctrl.breadcrumbs"
            data-ng-class="{active: $last}" data-ng-switch="$last">
            <span data-ng-switch-when="false"><a data-ng-click="$ctrl.unregisterBreadCrumb($index)"
                data-ng-href="{{bc.href}}">{{bc.label}}</a></span>
            <span data-ng-switch-default>{{bc.label}}</span>
        </li>
    </ol>
  `
};
