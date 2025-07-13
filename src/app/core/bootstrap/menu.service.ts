import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, share } from 'rxjs';

export interface MenuTag {
  color: string;
  value: string;
}

export interface MenuPermissions {
  only?: string | string[];
  except?: string | string[];
}

export interface MenuChildrenItem {
  route: string;
  name: string;
  translationKey?: string; // Added for translation
  type: 'link' | 'sub' | 'extLink' | 'extTabLink';
  children?: MenuChildrenItem[];
  permissions?: MenuPermissions;
}

export interface Menu {
  route: string;
  name: string;
  translationKey?: string; // Added for translation
  type: 'link' | 'sub' | 'extLink' | 'extTabLink';
  icon: string;
  label?: MenuTag;
  badge?: MenuTag;
  children?: MenuChildrenItem[];
  permissions?: MenuPermissions;
}

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  private readonly menu$ = new BehaviorSubject<Menu[]>([]);
  private readonly embeddedMenuData: { menu: Menu[] } = {
    menu: [
      {
        route: 'dashboard',
        name: 'Dashboard',
        translationKey: 'menu.Dashboard', // Store translation key separately
        type: 'link',
        icon: 'dashboard',
        badge: {
          color: 'red-50',
          value: '1',
        },
      },
      {
        route: 'media',
        name: 'Media',
        translationKey: 'menu.Media', // Store translation key separately
        type: 'link',
        icon: 'bar_chart',
        badge: {
          color: 'blue-50',
          value: '2',
        },
      },
    ],
  };

  constructor() {
    this.loadMenuData();
  }

  /** Get all the menu data. */
  getAll(): Observable<Menu[]> {
    return this.menu$.asObservable();
  }

  /** Observe the change of menu data. */
  change(): Observable<Menu[]> {
    return this.menu$.pipe(share());
  }

  /** Initialize the menu data. */
  set(menu: Menu[]): Observable<Menu[]> {
    this.menu$.next(menu);
    return this.menu$.asObservable();
  }

  /** Add one item to the menu data. */
  add(menu: Menu): void {
    const tmpMenu = this.menu$.value;
    tmpMenu.push(menu);
    this.menu$.next(tmpMenu);
  }

  /** Reset the menu data. */
  reset(): void {
    this.menu$.next([]);
  }

  /** Delete empty values and rebuild route. */
  buildRoute(routeArr: string[]): string {
    let route = '';
    routeArr.forEach(item => {
      if (item && item.trim()) {
        route += '/' + item.replace(/^\/+|\/+$/g, '');
      }
    });
    return route;
  }

  /** Get the menu item name based on current route. */
  getItemName(routeArr: string[]): string {
    return this.getLevel(routeArr)[routeArr.length - 1];
  }

  private isLeafItem(item: MenuChildrenItem): boolean {
    const cond0 = item.route === undefined;
    const cond1 = item.children === undefined;
    const cond2 = !cond1 && item.children?.length === 0;
    return cond0 || cond1 || cond2;
  }

  private deepClone(obj: any): any {
    return JSON.parse(JSON.stringify(obj));
  }

  private isJsonObjEqual(obj0: any, obj1: any): boolean {
    return JSON.stringify(obj0) === JSON.stringify(obj1);
  }

  private isRouteEqual(routeArr: string[], realRouteArr: string[]): boolean {
    realRouteArr = this.deepClone(realRouteArr);
    realRouteArr = realRouteArr.filter(r => r !== '');
    return this.isJsonObjEqual(routeArr, realRouteArr);
  }

  /** Get the menu level. */
  getLevel(routeArr: string[]): string[] {
    let tmpArr: string[] = [];
    this.menu$.value.forEach(item => {
      let unhandledLayer = [{ item, parentNamePathList: [], realRouteArr: [] }];
      while (unhandledLayer.length > 0) {
        let nextUnhandledLayer: any[] = [];
        for (const ele of unhandledLayer) {
          const eachItem = ele.item;
          const currentNamePathList = this.deepClone(ele.parentNamePathList).concat(eachItem.name);
          const currentRealRouteArr = this.deepClone(ele.realRouteArr).concat(eachItem.route);
          if (this.isRouteEqual(routeArr, currentRealRouteArr)) {
            tmpArr = currentNamePathList;
            break;
          }
          if (!this.isLeafItem(eachItem)) {
            const wrappedChildren = eachItem.children?.map(child => ({
              item: child,
              parentNamePathList: currentNamePathList,
              realRouteArr: currentRealRouteArr,
            }));
            nextUnhandledLayer = nextUnhandledLayer.concat(wrappedChildren);
          }
        }
        unhandledLayer = nextUnhandledLayer;
      }
    });
    return tmpArr;
  }

  /** Add namespace for translation (optional, call only when needed). */
  addNamespace(menu: Menu[] | MenuChildrenItem[], namespace: string): void {
    menu.forEach(menuItem => {
      menuItem.translationKey = `${namespace}.${menuItem.name}`; // Store in translationKey
      if (menuItem.children && menuItem.children.length > 0) {
        this.addNamespace(menuItem.children, namespace);
      }
    });
  }

  private loadMenuData(): void {
    try {
      this.set(this.embeddedMenuData.menu);
      // Optionally apply namespace for translation
      // this.addNamespace(this.embeddedMenuData.menu, 'menu');
    } catch (error) {
      console.error('Error setting menu data:', error);
      this.set([]);
    }
  }
}
