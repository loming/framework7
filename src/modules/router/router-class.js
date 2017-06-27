import $ from 'dom7';
import t7 from 'template7';
import Framework7Class from '../../utils/class';
import Utils from '../../utils/utils';
import Component from '../../utils/component';
import SwipeBack from './swipe-back';

import { forward, load, navigate } from './navigate';
import { tabLoad, tabRemove } from './tab';
import { modalLoad, modalRemove } from './modal';
import { backward, loadBack, back } from './back';

class Router extends Framework7Class {
  constructor(app, view) {
    super({}, [typeof view === 'undefined' ? app : view]);
    const router = this;

    // Is App Router
    router.isAppRouter = typeof view === 'undefined';

    if (router.isAppRouter) {
      // App Router
      Utils.extend(router, {
        app,
        params: app.params.view,
        routes: app.routes || [],
        cache: app.cache,
      });
    } else {
      // View Router
      Utils.extend(router, {
        app,
        view,
        params: view.params,
        routes: view.routes || [],
        $el: view.$el,
        $navbarEl: view.$navbarEl,
        navbarEl: view.navbarEl,
        history: view.history,
        cache: app.cache,
        dynamicNavbar: app.theme === 'ios' && view.params.iosDynamicNavbar,
        separateNavbar: app.theme === 'ios' && view.params.iosDynamicNavbar && view.params.iosSeparateDynamicNavbar,
        initialPages: [],
        initialNavbars: [],
      });
    }

    // Install Modules
    router.useInstanceModules();

    // Temporary Dom
    router.tempDom = document.createElement('div');

    // AllowPageChage
    router.allowPageChange = true;

    // Current Route
    let currentRoute = {};
    let previousRoute = {};
    Object.defineProperty(router, 'currentRoute', {
      enumerable: true,
      configurable: true,
      set(newRoute = {}) {
        previousRoute = Utils.extend({}, currentRoute);
        currentRoute = newRoute;
        router.url = currentRoute.url;
        router.emit('routeChange', newRoute, previousRoute, router);
      },
      get() {
        return currentRoute;
      },
    });
    Object.defineProperty(router, 'previousRoute', {
      enumerable: true,
      configurable: true,
      get() {
        return previousRoute;
      },
    });
    Utils.extend(router, {
      // Load
      forward,
      load,
      navigate,
      // Tab
      tabLoad,
      tabRemove,
      // Modal
      modalLoad,
      modalRemove,
      // Back
      backward,
      loadBack,
      back,
    });

    return router;
  }
  animateWithCSS(oldPage, newPage, oldNavbarInner, newNavbarInner, direction, callback) {
    const router = this;
    // Router Animation class
    const routerTransitionClass = `router-transition-${direction} router-transition-css-${direction}`;

    // AnimationEnd Callback
    (direction === 'forward' ? newPage : oldPage).animationEnd(() => {
      if (router.dynamicNavbar) {
        if (newNavbarInner.hasClass('sliding')) {
          newNavbarInner.find('.title, .left, .right, .left .icon, .subnavbar').transform('');
        } else {
          newNavbarInner.find('.sliding').transform('');
        }
        if (oldNavbarInner.hasClass('sliding')) {
          oldNavbarInner.find('.title, .left, .right, .left .icon, .subnavbar').transform('');
        } else {
          oldNavbarInner.find('.sliding').transform('');
        }
      }
      router.$el.removeClass(routerTransitionClass);
      if (callback) callback();
    });

    function prepareNavbars() {
      let slidingEls;
      if (newNavbarInner.hasClass('sliding')) {
        slidingEls = newNavbarInner.children('.left, .right, .title, .subnavbar');
      } else {
        slidingEls = newNavbarInner.find('.sliding');
      }
      if (!slidingEls) return;
      let navbarWidth;
      if (!router.separateNavbar) {
        navbarWidth = newNavbarInner[0].offsetWidth;
      }

      let oldNavbarTitleEl;
      if (oldNavbarInner.find('.title.sliding').length > 0) {
        oldNavbarTitleEl = oldNavbarInner.find('.title.sliding');
      } else {
        oldNavbarTitleEl = oldNavbarInner.hasClass('sliding') && oldNavbarInner.find('.title');
      }

      slidingEls.each((index, slidingEl) => {
        const $slidingEl = $(slidingEl);
        const slidingOffset = direction === 'forward' ? slidingEl.f7NavbarRightOffset : slidingEl.f7NavbarLeftOffset;
        if (router.params.iosAnimateNavbarBackIcon && $slidingEl.hasClass('left') && $slidingEl.find('.back .icon').length > 0) {
          let iconSlidingOffset = -slidingOffset;
          const iconTextEl = $slidingEl.find('.back span').eq(0);
          if (!router.separateNavbar) {
            if (direction === 'forward') {
              iconSlidingOffset -= navbarWidth;
            } else {
              iconSlidingOffset += navbarWidth / 5;
            }
          }
          $slidingEl.find('.back .icon').transform(`translate3d(${iconSlidingOffset}px,0,0)`);
          if (oldNavbarTitleEl && iconTextEl.length > 0) {
            oldNavbarTitleEl[0].f7NavbarLeftOffset += iconTextEl[0].offsetLeft;
          }
        }
        $slidingEl.transform(`translate3d(${slidingOffset}px,0,0)`);
      });
    }
    function animateNavbars() {
      const animateIcon = router.params.iosAnimateNavbarBackIcon;

      let navbarIconOffset = 0;
      let oldNavbarWidth;
      if (!router.separateNavbar && animateIcon) {
        oldNavbarWidth = oldNavbarInner[0].offsetWidth;
        if (direction === 'forward') {
          navbarIconOffset = oldNavbarWidth / 5;
        } else {
          navbarIconOffset = -oldNavbarWidth;
        }
      }

      // Old Navbar Sliding
      let oldNavbarSlidingEls;
      if (oldNavbarInner.hasClass('sliding')) {
        oldNavbarSlidingEls = oldNavbarInner.children('.left, .right, .title, .subnavbar');
      } else {
        oldNavbarSlidingEls = oldNavbarInner.find('.sliding');
      }

      if (oldNavbarSlidingEls) {
        oldNavbarSlidingEls.each((index, slidingEl) => {
          const $slidingEl = $(slidingEl);
          const offset = direction === 'forward' ? slidingEl.f7NavbarLeftOffset : slidingEl.f7NavbarRightOffset;
          $slidingEl.transform(`translate3d(${offset}px,0,0)`);
          if (animateIcon) {
            if ($slidingEl.hasClass('left') && $slidingEl.find('.back .icon').length > 0) {
              $slidingEl.find('.back .icon').transform(`translate3d(${-offset + navbarIconOffset}px,0,0)`);
            }
          }
        });
      }
    }
    if (router.dynamicNavbar) {
      // Prepare Navbars
      prepareNavbars();
      Utils.nextTick(() => {
        // Add class, start animation
        animateNavbars();
        router.$el.addClass(routerTransitionClass);
      });
    } else {
      // Add class, start animation
      router.$el.addClass(routerTransitionClass);
    }
  }
  animateWithJS(oldPage, newPage, oldNavbarInner, newNavbarInner, direction, callback) {
    const router = this;
    const dynamicNavbar = router.dynamicNavbar;
    const separateNavbar = router.separateNavbar;
    const animateIcon = router.params.iosAnimateNavbarBackIcon;
    const ios = router.app.theme === 'ios';
    const duration = ios ? 400 : 250;
    const routerTransitionClass = `router-transition-${direction} router-transition-js-${direction}`;

    let startTime = null;
    let done = false;

    let newNavEls;
    let oldNavEls;
    let navbarWidth = 0;

    function animatableNavEl(el, navbarInner) {
      const $el = $(el);
      const isSliding = $el.hasClass('sliding') || navbarInner.hasClass('sliding');
      const isSubnavbar = $el.hasClass('subnavbar');
      const needsOpacityTransition = isSliding ? !isSubnavbar : true;
      const hasIcon = isSliding && animateIcon && $el.hasClass('left') && $el.find('.back .icon').length > 0;
      let $iconEl;
      if (hasIcon) $iconEl = $el.find('.back .icon');
      return {
        $el,
        $iconEl,
        hasIcon,
        leftOffset: $el[0].f7NavbarLeftOffset,
        rightOffset: $el[0].f7NavbarRightOffset,
        isSliding,
        isSubnavbar,
        needsOpacityTransition,
      };
    }
    if (dynamicNavbar) {
      newNavEls = [];
      oldNavEls = [];
      newNavbarInner.find('.left, .right, .title, .subnavbar').each((index, navEl) => {
        newNavEls.push(animatableNavEl(navEl, newNavbarInner));
      });
      oldNavbarInner.find('.left, .right, .title, .subnavbar').each((index, navEl) => {
        oldNavEls.push(animatableNavEl(navEl, oldNavbarInner));
      });
      if (!separateNavbar) {
        navbarWidth = newNavbarInner[0].offsetWidth;
      }
      [oldNavEls, newNavEls].forEach((navEls) => {
        navEls.forEach((navEl) => {
          const n = navEl;
          const { isSliding, $el } = navEl;
          const otherEls = navEls === oldNavEls ? newNavEls : oldNavEls;
          if (!(isSliding && $el.hasClass('title') && otherEls)) return;
          otherEls.forEach((otherNavEl) => {
            if (otherNavEl.$el.hasClass('left') && otherNavEl.hasIcon) {
              const iconTextEl = otherNavEl.$el.find('.back span')[0];
              n.leftOffset += iconTextEl ? iconTextEl.offsetLeft : 0;
            }
          });
        });
      });
    }

    let $shadowEl;
    let $opacityEl;

    if (ios) {
      $shadowEl = $('<div class="page-shadow-effect"></div>');
      $opacityEl = $('<div class="page-opacity-effect"></div>');

      if (direction === 'forward') {
        newPage.append($shadowEl);
        oldPage.append($opacityEl);
      } else {
        newPage.append($opacityEl);
        oldPage.append($shadowEl);
      }
    }
    const easing = Utils.bezier(0.25, 0.1, 0.25, 1);

    function onDone() {
      newPage.transform('').css('opacity', '');
      oldPage.transform('').css('opacity', '');
      if (ios) {
        $shadowEl.remove();
        $opacityEl.remove();
        if (dynamicNavbar) {
          newNavEls.forEach((navEl) => {
            navEl.$el.transform('');
            navEl.$el.css('opacity', '');
          });
          oldNavEls.forEach((navEl) => {
            navEl.$el.transform('');
            navEl.$el.css('opacity', '');
          });
          newNavEls = [];
          oldNavEls = [];
        }
      }

      router.$el.removeClass(routerTransitionClass);

      if (callback) callback();
    }

    function render() {
      const time = Utils.now();
      if (!startTime) startTime = time;
      const progress = Math.max(Math.min((time - startTime) / duration, 1), 0);
      const easeProgress = easing(progress);

      if (progress >= 1) {
        done = true;
      }
      if (ios) {
        if (direction === 'forward') {
          newPage.transform(`translate3d(${(1 - easeProgress) * 100}%,0,0)`);
          oldPage.transform(`translate3d(${-easeProgress * 20}%,0,0)`);
          $shadowEl[0].style.opacity = easeProgress;
          $opacityEl[0].style.opacity = easeProgress;
        } else {
          newPage.transform(`translate3d(${-(1 - easeProgress) * 20}%,0,0)`);
          oldPage.transform(`translate3d(${easeProgress * 100}%,0,0)`);
          $shadowEl[0].style.opacity = 1 - easeProgress;
          $opacityEl[0].style.opacity = 1 - easeProgress;
        }
        if (dynamicNavbar) {
          newNavEls.forEach((navEl) => {
            const $el = navEl.$el;
            const offset = direction === 'forward' ? navEl.rightOffset : navEl.leftOffset;
            if (navEl.needsOpacityTransition) {
              $el[0].style.opacity = easeProgress;
            }
            if (navEl.isSliding) {
              $el.transform(`translate3d(${offset * (1 - easeProgress)}px,0,0)`);
            }
            if (navEl.hasIcon) {
              if (direction === 'forward') {
                navEl.$iconEl.transform(`translate3d(${(-offset - navbarWidth) * (1 - easeProgress)}px,0,0)`);
              } else {
                navEl.$iconEl.transform(`translate3d(${(-offset + (navbarWidth / 5)) * (1 - easeProgress)}px,0,0)`);
              }
            }
          });
          oldNavEls.forEach((navEl) => {
            const $el = navEl.$el;
            const offset = direction === 'forward' ? navEl.leftOffset : navEl.rightOffset;
            if (navEl.needsOpacityTransition) {
              $el[0].style.opacity = (1 - easeProgress);
            }
            if (navEl.isSliding) {
              $el.transform(`translate3d(${offset * (easeProgress)}px,0,0)`);
            }
            if (navEl.hasIcon) {
              if (direction === 'forward') {
                navEl.$iconEl.transform(`translate3d(${(-offset + (navbarWidth / 5)) * (easeProgress)}px,0,0)`);
              } else {
                navEl.$iconEl.transform(`translate3d(${(-offset - navbarWidth) * (easeProgress)}px,0,0)`);
              }
            }
          });
        }
      } else {
        if (direction === 'forward') {
          newPage.transform(`translate3d(0, ${(1 - easeProgress) * 56}px,0)`);
          newPage.css('opacity', easeProgress);
        } else {
          oldPage.transform(`translate3d(0, ${easeProgress * 56}px,0)`);
          oldPage.css('opacity', 1 - easeProgress);
        }
      }

      if (done) {
        onDone();
        return;
      }
      Utils.nextFrame(render);
    }

    router.$el.addClass(routerTransitionClass);

    Utils.nextFrame(render);
  }
  animate(...args) {
    // Args: oldPage, newPage, oldNavbarInner, newNavbarInner, direction, callback
    const router = this;
    if (router.params.animateCustom) {
      router.params.animateCustom.apply(router, args);
    } else if (router.params.animateWithJS) {
      router.animateWithJS(...args);
    } else {
      router.animateWithCSS(...args);
    }
  }
  remove(el) {
    const router = this;
    const $el = $(el);
    if ($el[0].f7Component && $el[0].f7Component.destroy) {
      $el[0].f7Component.destroy();
    }
    if (!router.params.removeElements) {
      return;
    }
    if (router.params.removeElementsWithTimeout) {
      setTimeout(() => {
        $el.remove();
      }, router.params.removeElementsTimeout);
    } else {
      $el.remove();
    }
  }
  getPageEl(content) {
    const router = this;
    if (typeof content === 'string') {
      router.tempDom.innerHTML = content;
    } else {
      if ($(content).hasClass('page')) {
        return content;
      }
      router.tempDom.innerHTML = '';
      $(router.tempDom).append(content);
    }

    return router.findElement('.page', router.tempDom);
  }
  findElement(stringSelector, container, notStacked) {
    const router = this;
    const view = router.view;
    const app = router.app;

    // Modals Selector
    const modalsSelector = '.popup, .dialog, .popover, .actions-modal, .sheet-modal, .login-screen, .page';

    const $container = $(container);
    let selector = stringSelector;
    if (notStacked) selector += ':not(.stacked)';

    let found = $container
      .find(selector)
      .filter((index, el) => $(el).parents(modalsSelector).length === 0);

    if (found.length > 1) {
      if (typeof view.selector === 'string') {
        // Search in related view
        found = $container.find(`${view.selector} ${selector}`);
      }
      if (found.length > 1) {
        // Search in main view
        found = $container.find(`.${app.params.viewMainClass} ${selector}`);
      }
    }
    if (found.length === 1) return found;

    // Try to find not stacked
    if (!notStacked) found = router.findElement(selector, $container, true);
    if (found && found.length === 1) return found;
    if (found && found.length > 1) return $(found[0]);
    return undefined;
  }
  flattenRoutes(routes = this.routes) {
    let flattenedRoutes = [];
    routes.forEach((route) => {
      if ('routes' in route) {
        const mergedPathsRoutes = route.routes.map((childRoute) => {
          const cRoute = Utils.extend({}, childRoute);
          cRoute.path = (`${route.path}/${cRoute.path}`).replace('///', '/').replace('//', '/');
          return cRoute;
        });
        flattenedRoutes = flattenedRoutes.concat(route, this.flattenRoutes(mergedPathsRoutes));
      } else if ('tabs' in route && route.tabs) {
        const mergedPathsRoutes = route.tabs.map((tabRoute) => {
          const tRoute = Utils.extend({}, route, {
            path: (`${route.path}/${tabRoute.path}`).replace('///', '/').replace('//', '/'),
            parentPath: route.path,
            tab: tabRoute,
          });
          delete tRoute.tabs;
          return tRoute;
        });
        flattenedRoutes = flattenedRoutes.concat(this.flattenRoutes(mergedPathsRoutes));
      } else {
        flattenedRoutes.push(route);
      }
    });
    return flattenedRoutes;
  }
  findMatchingRoute(url, parseOnly) {
    if (!url) return undefined;
    const router = this;
    const routes = router.routes;
    const flattenedRoutes = router.flattenRoutes(routes);
    const query = Utils.parseUrlQuery(url);
    const hash = url.split('#')[1];
    const params = {};
    const path = url.split('#')[0].split('?')[0];
    const urlParts = path.split('/').filter(part => part !== '');
    if (parseOnly) {
      return {
        query,
        hash,
        params,
        url,
        path,
      };
    }

    let matchingRoute;
    function parseRoute(str = '') {
      const parts = [];
      str.split('/').forEach((part) => {
        if (part !== '') {
          if (part.indexOf(':') === 0) {
            parts.push({
              name: part.replace(':', ''),
            });
          } else parts.push(part);
        }
      });
      return parts;
    }
    flattenedRoutes.forEach((route) => {
      if (matchingRoute) return;
      const parsedRoute = parseRoute(route.path);
      if (parsedRoute.length !== urlParts.length) return;
      let matchedParts = 0;
      parsedRoute.forEach((routePart, index) => {
        if (typeof routePart === 'string' && urlParts[index] === routePart) {
          matchedParts += 1;
        }
        if (typeof routePart === 'object') {
          params[routePart.name] = urlParts[index];
          matchedParts += 1;
        }
      });
      if (matchedParts === urlParts.length) {
        matchingRoute = {
          query,
          hash,
          params,
          url,
          path,
          route,
        };
      }
    });
    return matchingRoute;
  }
  removeFromXhrCache(url) {
    const router = this;
    const xhrCache = router.cache.xhr;
    let index = false;
    for (let i = 0; i < xhrCache.length; i += 1) {
      if (xhrCache[i].url === url) index = i;
    }
    if (index !== false) xhrCache.splice(index, 1);
  }
  xhrRequest(requestUrl, ignoreCache) {
    const router = this;
    const params = router.params;
    let url = requestUrl;
    // should we ignore get params or not
    if (params.xhrCacheIgnoreGetParameters && url.indexOf('?') >= 0) {
      url = url.split('?')[0];
    }

    return Utils.promise((resolve, reject) => {
      if (params.xhrCache && !ignoreCache && url.indexOf('nocache') < 0 && params.xhrCacheIgnore.indexOf(url) < 0) {
        for (let i = 0; i < router.cache.xhr.length; i += 1) {
          const cachedUrl = router.cache.xhr[i];
          if (cachedUrl.url === url) {
            // Check expiration
            if (Utils.now() - cachedUrl.time < params.xhrCacheDuration) {
              // Load from cache
              resolve(cachedUrl.content);
              return;
            }
          }
        }
      }
      router.xhr = $.ajax({
        url,
        method: 'GET',
        beforeSend() {
          router.emit('routerAjaxStart');
        },
        complete(xhr, status) {
          router.emit('routerAjaxComplete');
          if ((status !== 'error' && status !== 'timeout' && (xhr.status >= 200 && xhr.status < 300)) || xhr.status === 0) {
            if (params.xhrCache && xhr.responseText !== '') {
              router.removeFromXhrCache(url);
              router.cache.xhr.push({
                url,
                time: Utils.now(),
                content: xhr.responseText,
              });
            }
            resolve(xhr.responseText);
          } else {
            reject(xhr);
          }
        },
        error(xhr) {
          router.emit('ajaxError');
          reject(xhr);
        },
      });
    });
  }
  // Remove theme elements
  removeThemeElements(el) {
    const router = this;
    const theme = router.app.theme;
    $(el).find(`.${theme === 'md' ? 'ios' : 'md'}-only`).remove();
  }
  templateLoader(template, templateUrl, options, resolve, reject) {
    const router = this;
    function compile(t) {
      let compiledHtml;
      let context;
      try {
        context = options.context || {};
        if (typeof context === 'function') context = context.call(router.app);
        else if (typeof context === 'string') {
          try {
            context = JSON.parse(context);
          } catch (err) {
            reject();
            throw (err);
          }
        }
        if (typeof t === 'function') {
          compiledHtml = t(context);
        } else {
          compiledHtml = t7.compile(t)(Utils.extend({}, context || {}, {
            $app: router.app,
            $root: router.app.data,
            $route: options.route,
            $router: router,
            $theme: {
              ios: router.app.theme === 'ios',
              md: router.app.theme === 'md',
            },
          }));
        }
      } catch (err) {
        reject();
        throw (err);
      }
      resolve(compiledHtml, { context });
    }
    if (templateUrl) {
      // Load via XHR
      if (router.xhr) {
        router.xhr.abort();
        router.xhr = false;
      }
      router
        .xhrRequest(templateUrl)
        .then((templateContent) => {
          compile(templateContent);
        })
        .catch(() => {
          reject();
        });
    } else {
      compile(template);
    }
  }
  popupTemplateLoader(template, templateUrl, options, resolve, reject) {
    const router = this;
    return router.templateLoader(template, templateUrl, options, (html) => {
      resolve(html);
    }, reject);
  }
  tabTemplateLoader(template, templateUrl, options, resolve, reject) {
    const router = this;
    return router.templateLoader(template, templateUrl, options, (html) => {
      resolve(html);
    }, reject);
  }
  pageTemplateLoader(template, templateUrl, options, resolve, reject) {
    const router = this;
    return router.templateLoader(template, templateUrl, options, (html, newOptions = {}) => {
      resolve(router.getPageEl(html), newOptions);
    }, reject);
  }
  componentLoader(component, componentUrl, options, resolve, reject) {
    const router = this;
    const url = typeof component === 'string' ? component : componentUrl;
    function compile(c) {
      const createdComponent = Component.create(c, {
        $app: router.app,
        $root: router.app.data,
        $route: options.route,
        $router: router,
        $$: $,
        $dom7: $,
        $theme: {
          ios: router.app.theme === 'ios',
          md: router.app.theme === 'md',
        },
      });
      resolve(createdComponent.el, { pageEvents: c.on });
    }
    if (url) {
      // Load via XHR
      if (router.xhr) {
        router.xhr.abort();
        router.xhr = false;
      }
      router
        .xhrRequest(url)
        .then((loadedComponent) => {
          compile(Component.parse(loadedComponent));
        })
        .catch(() => {
          reject();
        });
    } else {
      compile(component);
    }
  }
  popupComponentLoader(rootEl, component, componentUrl, options, resolve, reject) {
    const router = this;
    router.componentLoader(component, componentUrl, options, (el) => {
      resolve(el);
    }, reject);
  }
  tabComponentLoader(tabEl, component, componentUrl, options, resolve, reject) {
    const router = this;
    router.componentLoader(component, componentUrl, options, (el) => {
      resolve(el);
    }, reject);
  }
  pageComponentLoader(routerEl, component, componentUrl, options, resolve, reject) {
    const router = this;
    router.componentLoader(component, componentUrl, options, (el, newOptions = {}) => {
      resolve(el, newOptions);
    }, reject);
  }
  getPageData(pageEl, navbarEl, from, to, route = {}) {
    const router = this;
    const $pageEl = $(pageEl);
    const $navbarEl = $(navbarEl);
    const currentPage = $pageEl[0].f7Page || {};
    let direction;
    if ((from === 'next' && to === 'current') || (from === 'current' && to === 'previous')) direction = 'forward';
    if ((from === 'current' && to === 'next') || (from === 'previous' && to === 'current')) direction = 'backward';
    const page = {
      app: router.app,
      view: router.view,
      $el: $pageEl,
      el: $pageEl[0],
      $pageEl,
      pageEl: $pageEl[0],
      $navbarEl,
      navbarEl: $navbarEl[0],
      name: $pageEl.attr('data-name'),
      position: from,
      from,
      to,
      direction,
      route: currentPage.route ? currentPage.route : route,
    };
    $pageEl[0].f7Page = page;
    return page;
  }
  // Callbacks
  pageCallback(callback, pageEl, navbarEl, from, to, options = {}) {
    if (!pageEl) return;
    const router = this;
    const $pageEl = $(pageEl);
    const { route, on = {} } = options;

    const camelName = `page${callback[0].toUpperCase() + callback.slice(1, callback.length)}`;
    const colonName = `page:${callback.toLowerCase()}`;

    let page = {};
    if (callback === 'beforeRemove' && $pageEl[0].f7Page) {
      page = Utils.extend($pageEl[0].f7Page, { from, to, position: from });
    } else {
      page = router.getPageData(pageEl, navbarEl, from, to, route);
    }

    function attachEvents() {
      if ($pageEl[0].f7PageEventsAttached) return;
      $pageEl[0].f7PageEventsAttached = true;
      if (options.pageEvents) {
        $pageEl[0].f7PageEvents = options.pageEvents;
        Object.keys(options.pageEvents).forEach((eventName) => {
          $pageEl.on(eventName, options.pageEvents[eventName]);
        });
      }
    }
    if (callback === 'mounted') {
      attachEvents();
    }
    if (callback === 'init') {
      attachEvents();
      if ($pageEl[0].f7PageInitialized) {
        if (on.pageReinit) on.pageReinit(page);
        $pageEl.trigger('page:reinit', page);
        router.emit('pageReinit', page);
        return;
      }
      $pageEl[0].f7PageInitialized = true;
    }
    if (callback === 'beforeRemove') {
      if ($pageEl[0].f7PageEventsAttached && $pageEl[0].f7PageEvents) {
        Object.keys($pageEl[0].f7PageEvents).forEach((eventName) => {
          $pageEl.off(eventName, $pageEl[0].f7PageEvents[eventName]);
        });
      }
    }
    if (on[camelName]) on[camelName](page);
    $pageEl.trigger(colonName, page);
    router.emit(camelName, page);

    if (callback === 'beforeRemove') {
      $pageEl[0].f7Page = null;
      page = null;
    }
  }
  saveHistory() {
    const router = this;
    router.view.history = router.history;
    if (router.params.pushState) {
      window.localStorage[`f7_router_${router.view.index}_history`] = JSON.stringify(router.history);
    }
  }
  restoreHistory() {
    const router = this;
    if (router.params.pushState && window.localStorage[`f7_router_${router.view.index}_history`]) {
      router.history = JSON.parse(window.localStorage[`f7_router_${router.view.index}_history`]);
      router.view.history = router.history;
    }
  }
  clearHistory() {
    const router = this;
    router.history = [];
    router.saveHistory();
  }
  init() {
    const router = this;
    const app = router.app;

    // Init Swipeback
    if (router.view && router.params.swipeBackPage && app.theme === 'ios') {
      SwipeBack(router);
    }

    // Dynamic not separated navbbar
    if (router.dynamicNavbar && !router.separateNavbar) {
      router.$el.addClass('router-dynamic-navbar-inside');
    }

    let initUrl = router.params.url;
    const documentUrl = document.location.href.split(document.location.origin)[1];
    let historyRestored;
    if (!router.params.pushState) {
      if (!initUrl) {
        initUrl = documentUrl;
      }
    } else {
      if (documentUrl.indexOf(router.params.pushStateSeparator) >= 0) {
        initUrl = documentUrl.split(router.params.pushStateSeparator)[1];
      } else {
        initUrl = documentUrl;
      }
      router.restoreHistory();
      if (router.history.indexOf(initUrl) >= 0) {
        router.history = router.history.slice(0, router.history.indexOf(initUrl) + 1);
      } else {
        router.history = [documentUrl.split(router.params.pushStateSeparator)[0], initUrl];
      }
      if (router.history.length > 1) {
        historyRestored = true;
      } else {
        router.history = [];
      }
      router.saveHistory();
    }
    let currentRoute;
    if (router.history.length > 1) {
      // Will load page
      currentRoute = router.findMatchingRoute(router.history[0]);
      if (!currentRoute) {
        currentRoute = Utils.extend(router.findMatchingRoute(router.history[0], true), {
          route: {
            url: router.history[0],
            path: router.history[0].split('?')[0],
          },
        });
      }
    } else {
      // Don't load page
      currentRoute = router.findMatchingRoute(initUrl);
      if (!router.currentRoute) {
        currentRoute = Utils.extend(router.findMatchingRoute(initUrl, true), {
          route: {
            url: initUrl,
            path: initUrl.split('?')[0],
          },
        });
      }
    }

    if (router.params.stackPages) {
      router.$el.children('.page').each((index, pageEl) => {
        const $pageEl = $(pageEl);
        router.initialPages.push($pageEl[0]);
        if (router.separateNavbar && $pageEl.children('.navbar').length > 0) {
          router.initialNavbars.push($pageEl.children('.navbar').find('.navbar-inner')[0]);
        }
      });
    }

    if (router.$el.children('.page:not(.stacked)').length === 0 && initUrl) {
      // No pages presented in DOM, reload new page
      router.navigate(initUrl, {
        reloadCurrent: true,
        pushState: false,
      });
    } else {
      // Init current DOM page
      router.currentRoute = currentRoute;
      router.$el.children('.page:not(.stacked)').each((index, pageEl) => {
        const $pageEl = $(pageEl);
        let $navbarInnerEl;
        $pageEl.addClass('page-current');
        if (router.separateNavbar) {
          $navbarInnerEl = $pageEl.children('.navbar').children('.navbar-inner');
          if ($navbarInnerEl.length > 0) {
            router.$navbarEl.append($navbarInnerEl);
            $pageEl.children('.navbar').remove();
          }
        }
        router.pageCallback('init', $pageEl, $navbarInnerEl, 'current', undefined, { route: router.currentRoute });
      });
      if (historyRestored) {
        router.navigate(initUrl, {
          pushState: false,
          history: false,
          animate: router.params.pushStateAnimateOnLoad,
          on: {
            pageAfterIn() {
              if (router.history.length > 2) {
                router.back({ preload: true });
              }
            },
          },
        });
      } else {
        router.history.push(initUrl);
        router.saveHistory();
      }
    }
    router.emit('routerInit', router);
  }
  destroy() {
    let router = this;

    router.emit('routerDestroy', router);

    // Delete props & methods
    Object.keys(router).forEach((routerProp) => {
      router[routerProp] = null;
      delete router[routerProp];
    });

    router = null;
  }
}

export default Router;
