import { BreadcrumbService } from './breadcrumbs/breadcrumb.service';

class HeaderData {
  pageName: string;
}

export class ApplicationHeaderService {
  data: HeaderData;

  static $inject = ['breadcrumbService'];
  constructor(public breadcrumbService: BreadcrumbService) {
    this.data = new HeaderData();
  }

  getPageName(): string {
    return this.data.pageName;
  }

  setPageName($name: string) {
    this.data.pageName = $name;
  }
}
