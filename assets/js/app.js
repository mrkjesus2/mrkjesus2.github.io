(function() {
"use strict";

/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * A component handler interface using the revealing module design pattern.
 * More details on this design pattern here:
 * https://github.com/jasonmayes/mdl-component-design-pattern
 *
 * @author Jason Mayes.
 */
/* exported componentHandler */

// Pre-defining the componentHandler interface, for closure documentation and
// static verification.
var componentHandler = {
  /**
   * Searches existing DOM for elements of our component type and upgrades them
   * if they have not already been upgraded.
   *
   * @param {string=} optJsClass the programatic name of the element class we
   * need to create a new instance of.
   * @param {string=} optCssClass the name of the CSS class elements of this
   * type will have.
   */
  upgradeDom: function(optJsClass, optCssClass) {},
  /**
   * Upgrades a specific element rather than all in the DOM.
   *
   * @param {!Element} element The element we wish to upgrade.
   * @param {string=} optJsClass Optional name of the class we want to upgrade
   * the element to.
   */
  upgradeElement: function(element, optJsClass) {},
  /**
   * Upgrades a specific list of elements rather than all in the DOM.
   *
   * @param {!Element|!Array<!Element>|!NodeList|!HTMLCollection} elements
   * The elements we wish to upgrade.
   */
  upgradeElements: function(elements) {},
  /**
   * Upgrades all registered components found in the current DOM. This is
   * automatically called on window load.
   */
  upgradeAllRegistered: function() {},
  /**
   * Allows user to be alerted to any upgrades that are performed for a given
   * component type
   *
   * @param {string} jsClass The class name of the MDL component we wish
   * to hook into for any upgrades performed.
   * @param {function(!HTMLElement)} callback The function to call upon an
   * upgrade. This function should expect 1 parameter - the HTMLElement which
   * got upgraded.
   */
  registerUpgradedCallback: function(jsClass, callback) {},
  /**
   * Registers a class for future use and attempts to upgrade existing DOM.
   *
   * @param {componentHandler.ComponentConfigPublic} config the registration configuration
   */
  register: function(config) {},
  /**
   * Downgrade either a given node, an array of nodes, or a NodeList.
   *
   * @param {!Node|!Array<!Node>|!NodeList} nodes
   */
  downgradeElements: function(nodes) {}
};

componentHandler = (function() {
  'use strict';

  /** @type {!Array<componentHandler.ComponentConfig>} */
  var registeredComponents_ = [];

  /** @type {!Array<componentHandler.Component>} */
  var createdComponents_ = [];

  var componentConfigProperty_ = 'mdlComponentConfigInternal_';

  /**
   * Searches registered components for a class we are interested in using.
   * Optionally replaces a match with passed object if specified.
   *
   * @param {string} name The name of a class we want to use.
   * @param {componentHandler.ComponentConfig=} optReplace Optional object to replace match with.
   * @return {!Object|boolean}
   * @private
   */
  function findRegisteredClass_(name, optReplace) {
    for (var i = 0; i < registeredComponents_.length; i++) {
      if (registeredComponents_[i].className === name) {
        if (typeof optReplace !== 'undefined') {
          registeredComponents_[i] = optReplace;
        }
        return registeredComponents_[i];
      }
    }
    return false;
  }

  /**
   * Returns an array of the classNames of the upgraded classes on the element.
   *
   * @param {!Element} element The element to fetch data from.
   * @return {!Array<string>}
   * @private
   */
  function getUpgradedListOfElement_(element) {
    var dataUpgraded = element.getAttribute('data-upgraded');
    // Use `['']` as default value to conform the `,name,name...` style.
    return dataUpgraded === null ? [''] : dataUpgraded.split(',');
  }

  /**
   * Returns true if the given element has already been upgraded for the given
   * class.
   *
   * @param {!Element} element The element we want to check.
   * @param {string} jsClass The class to check for.
   * @returns {boolean}
   * @private
   */
  function isElementUpgraded_(element, jsClass) {
    var upgradedList = getUpgradedListOfElement_(element);
    return upgradedList.indexOf(jsClass) !== -1;
  }

  /**
   * Searches existing DOM for elements of our component type and upgrades them
   * if they have not already been upgraded.
   *
   * @param {string=} optJsClass the programatic name of the element class we
   * need to create a new instance of.
   * @param {string=} optCssClass the name of the CSS class elements of this
   * type will have.
   */
  function upgradeDomInternal(optJsClass, optCssClass) {
    if (typeof optJsClass === 'undefined' &&
        typeof optCssClass === 'undefined') {
      for (var i = 0; i < registeredComponents_.length; i++) {
        upgradeDomInternal(registeredComponents_[i].className,
            registeredComponents_[i].cssClass);
      }
    } else {
      var jsClass = /** @type {string} */ (optJsClass);
      if (typeof optCssClass === 'undefined') {
        var registeredClass = findRegisteredClass_(jsClass);
        if (registeredClass) {
          optCssClass = registeredClass.cssClass;
        }
      }

      var elements = document.querySelectorAll('.' + optCssClass);
      for (var n = 0; n < elements.length; n++) {
        upgradeElementInternal(elements[n], jsClass);
      }
    }
  }

  /**
   * Upgrades a specific element rather than all in the DOM.
   *
   * @param {!Element} element The element we wish to upgrade.
   * @param {string=} optJsClass Optional name of the class we want to upgrade
   * the element to.
   */
  function upgradeElementInternal(element, optJsClass) {
    // Verify argument type.
    if (!(typeof element === 'object' && element instanceof Element)) {
      throw new Error('Invalid argument provided to upgrade MDL element.');
    }
    var upgradedList = getUpgradedListOfElement_(element);
    var classesToUpgrade = [];
    // If jsClass is not provided scan the registered components to find the
    // ones matching the element's CSS classList.
    if (!optJsClass) {
      var classList = element.classList;
      registeredComponents_.forEach(function(component) {
        // Match CSS & Not to be upgraded & Not upgraded.
        if (classList.contains(component.cssClass) &&
            classesToUpgrade.indexOf(component) === -1 &&
            !isElementUpgraded_(element, component.className)) {
          classesToUpgrade.push(component);
        }
      });
    } else if (!isElementUpgraded_(element, optJsClass)) {
      classesToUpgrade.push(findRegisteredClass_(optJsClass));
    }

    // Upgrade the element for each classes.
    for (var i = 0, n = classesToUpgrade.length, registeredClass; i < n; i++) {
      registeredClass = classesToUpgrade[i];
      if (registeredClass) {
        // Mark element as upgraded.
        upgradedList.push(registeredClass.className);
        element.setAttribute('data-upgraded', upgradedList.join(','));
        var instance = new registeredClass.classConstructor(element);
        instance[componentConfigProperty_] = registeredClass;
        createdComponents_.push(instance);
        // Call any callbacks the user has registered with this component type.
        for (var j = 0, m = registeredClass.callbacks.length; j < m; j++) {
          registeredClass.callbacks[j](element);
        }

        if (registeredClass.widget) {
          // Assign per element instance for control over API
          element[registeredClass.className] = instance;
        }
      } else {
        throw new Error(
          'Unable to find a registered component for the given class.');
      }

      var ev;
      if ('CustomEvent' in window && typeof window.CustomEvent === 'function') {
        ev = new Event('mdl-componentupgraded', {
          'bubbles': true, 'cancelable': false
        });
      } else {
        ev = document.createEvent('Events');
        ev.initEvent('mdl-componentupgraded', true, true);
      }
      element.dispatchEvent(ev);
    }
  }

  /**
   * Upgrades a specific list of elements rather than all in the DOM.
   *
   * @param {!Element|!Array<!Element>|!NodeList|!HTMLCollection} elements
   * The elements we wish to upgrade.
   */
  function upgradeElementsInternal(elements) {
    if (!Array.isArray(elements)) {
      if (typeof elements.item === 'function') {
        elements = Array.prototype.slice.call(/** @type {Array} */ (elements));
      } else {
        elements = [elements];
      }
    }
    for (var i = 0, n = elements.length, element; i < n; i++) {
      element = elements[i];
      if (element instanceof HTMLElement) {
        upgradeElementInternal(element);
        if (element.children.length > 0) {
          upgradeElementsInternal(element.children);
        }
      }
    }
  }

  /**
   * Registers a class for future use and attempts to upgrade existing DOM.
   *
   * @param {componentHandler.ComponentConfigPublic} config
   */
  function registerInternal(config) {
    // In order to support both Closure-compiled and uncompiled code accessing
    // this method, we need to allow for both the dot and array syntax for
    // property access. You'll therefore see the `foo.bar || foo['bar']`
    // pattern repeated across this method.
    var widgetMissing = (typeof config.widget === 'undefined' &&
        typeof config['widget'] === 'undefined');
    var widget = true;

    if (!widgetMissing) {
      widget = config.widget || config['widget'];
    }

    var newConfig = /** @type {componentHandler.ComponentConfig} */ ({
      classConstructor: config.constructor || config['constructor'],
      className: config.classAsString || config['classAsString'],
      cssClass: config.cssClass || config['cssClass'],
      widget: widget,
      callbacks: []
    });

    registeredComponents_.forEach(function(item) {
      if (item.cssClass === newConfig.cssClass) {
        throw new Error('The provided cssClass has already been registered: ' + item.cssClass);
      }
      if (item.className === newConfig.className) {
        throw new Error('The provided className has already been registered');
      }
    });

    if (config.constructor.prototype
        .hasOwnProperty(componentConfigProperty_)) {
      throw new Error(
          'MDL component classes must not have ' + componentConfigProperty_ +
          ' defined as a property.');
    }

    var found = findRegisteredClass_(config.classAsString, newConfig);

    if (!found) {
      registeredComponents_.push(newConfig);
    }
  }

  /**
   * Allows user to be alerted to any upgrades that are performed for a given
   * component type
   *
   * @param {string} jsClass The class name of the MDL component we wish
   * to hook into for any upgrades performed.
   * @param {function(!HTMLElement)} callback The function to call upon an
   * upgrade. This function should expect 1 parameter - the HTMLElement which
   * got upgraded.
   */
  function registerUpgradedCallbackInternal(jsClass, callback) {
    var regClass = findRegisteredClass_(jsClass);
    if (regClass) {
      regClass.callbacks.push(callback);
    }
  }

  /**
   * Upgrades all registered components found in the current DOM. This is
   * automatically called on window load.
   */
  function upgradeAllRegisteredInternal() {
    for (var n = 0; n < registeredComponents_.length; n++) {
      upgradeDomInternal(registeredComponents_[n].className);
    }
  }

  /**
   * Check the component for the downgrade method.
   * Execute if found.
   * Remove component from createdComponents list.
   *
   * @param {?componentHandler.Component} component
   */
  function deconstructComponentInternal(component) {
    if (component) {
      var componentIndex = createdComponents_.indexOf(component);
      createdComponents_.splice(componentIndex, 1);

      var upgrades = component.element_.getAttribute('data-upgraded').split(',');
      var componentPlace = upgrades.indexOf(component[componentConfigProperty_].classAsString);
      upgrades.splice(componentPlace, 1);
      component.element_.setAttribute('data-upgraded', upgrades.join(','));

      var ev;
      if ('CustomEvent' in window && typeof window.CustomEvent === 'function') {
        ev = new Event('mdl-componentdowngraded', {
          'bubbles': true, 'cancelable': false
        });
      } else {
        ev = document.createEvent('Events');
        ev.initEvent('mdl-componentdowngraded', true, true);
      }
    }
  }

  /**
   * Downgrade either a given node, an array of nodes, or a NodeList.
   *
   * @param {!Node|!Array<!Node>|!NodeList} nodes
   */
  function downgradeNodesInternal(nodes) {
    /**
     * Auxiliary function to downgrade a single node.
     * @param  {!Node} node the node to be downgraded
     */
    var downgradeNode = function(node) {
      createdComponents_.filter(function(item) {
        return item.element_ === node;
      }).forEach(deconstructComponentInternal);
    };
    if (nodes instanceof Array || nodes instanceof NodeList) {
      for (var n = 0; n < nodes.length; n++) {
        downgradeNode(nodes[n]);
      }
    } else if (nodes instanceof Node) {
      downgradeNode(nodes);
    } else {
      throw new Error('Invalid argument provided to downgrade MDL nodes.');
    }
  }

  // Now return the functions that should be made public with their publicly
  // facing names...
  return {
    upgradeDom: upgradeDomInternal,
    upgradeElement: upgradeElementInternal,
    upgradeElements: upgradeElementsInternal,
    upgradeAllRegistered: upgradeAllRegisteredInternal,
    registerUpgradedCallback: registerUpgradedCallbackInternal,
    register: registerInternal,
    downgradeElements: downgradeNodesInternal
  };
})();

/**
 * Describes the type of a registered component type managed by
 * componentHandler. Provided for benefit of the Closure compiler.
 *
 * @typedef {{
 *   constructor: Function,
 *   classAsString: string,
 *   cssClass: string,
 *   widget: (string|boolean|undefined)
 * }}
 */
componentHandler.ComponentConfigPublic;  // jshint ignore:line

/**
 * Describes the type of a registered component type managed by
 * componentHandler. Provided for benefit of the Closure compiler.
 *
 * @typedef {{
 *   constructor: !Function,
 *   className: string,
 *   cssClass: string,
 *   widget: (string|boolean),
 *   callbacks: !Array<function(!HTMLElement)>
 * }}
 */
componentHandler.ComponentConfig;  // jshint ignore:line

/**
 * Created component (i.e., upgraded element) type as managed by
 * componentHandler. Provided for benefit of the Closure compiler.
 *
 * @typedef {{
 *   element_: !HTMLElement,
 *   className: string,
 *   classAsString: string,
 *   cssClass: string,
 *   widget: string
 * }}
 */
componentHandler.Component;  // jshint ignore:line

// Export all symbols, for the benefit of Closure compiler.
// No effect on uncompiled code.
componentHandler['upgradeDom'] = componentHandler.upgradeDom;
componentHandler['upgradeElement'] = componentHandler.upgradeElement;
componentHandler['upgradeElements'] = componentHandler.upgradeElements;
componentHandler['upgradeAllRegistered'] =
    componentHandler.upgradeAllRegistered;
componentHandler['registerUpgradedCallback'] =
    componentHandler.registerUpgradedCallback;
componentHandler['register'] = componentHandler.register;
componentHandler['downgradeElements'] = componentHandler.downgradeElements;
window.componentHandler = componentHandler;
window['componentHandler'] = componentHandler;

window.addEventListener('load', function() {
  'use strict';

  /**
   * Performs a "Cutting the mustard" test. If the browser supports the features
   * tested, adds a mdl-js class to the <html> element. It then upgrades all MDL
   * components requiring JavaScript.
   */
  if ('classList' in document.createElement('div') &&
      'querySelector' in document &&
      'addEventListener' in window && Array.prototype.forEach) {
    document.documentElement.classList.add('mdl-js');
    componentHandler.upgradeAllRegistered();
  } else {
    /**
     * Dummy function to avoid JS errors.
     */
    componentHandler.upgradeElement = function() {};
    /**
     * Dummy function to avoid JS errors.
     */
    componentHandler.register = function() {};
  }
});

// Source: https://github.com/darius/requestAnimationFrame/blob/master/requestAnimationFrame.js
// Adapted from https://gist.github.com/paulirish/1579671 which derived from
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
// requestAnimationFrame polyfill by Erik Möller.
// Fixes from Paul Irish, Tino Zijdel, Andrew Mao, Klemen Slavič, Darius Bacon
// MIT license
if (!Date.now) {
    /**
   * Date.now polyfill.
   * @return {number} the current Date
   */
    Date.now = function () {
        return new Date().getTime();
    };
    Date['now'] = Date.now;
}
var vendors = [
    'webkit',
    'moz'
];
for (var i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
    var vp = vendors[i];
    window.requestAnimationFrame = window[vp + 'RequestAnimationFrame'];
    window.cancelAnimationFrame = window[vp + 'CancelAnimationFrame'] || window[vp + 'CancelRequestAnimationFrame'];
    window['requestAnimationFrame'] = window.requestAnimationFrame;
    window['cancelAnimationFrame'] = window.cancelAnimationFrame;
}
if (/iP(ad|hone|od).*OS 6/.test(window.navigator.userAgent) || !window.requestAnimationFrame || !window.cancelAnimationFrame) {
    var lastTime = 0;
    /**
   * requestAnimationFrame polyfill.
   * @param  {!Function} callback the callback function.
   */
    window.requestAnimationFrame = function (callback) {
        var now = Date.now();
        var nextTime = Math.max(lastTime + 16, now);
        return setTimeout(function () {
            callback(lastTime = nextTime);
        }, nextTime - now);
    };
    window.cancelAnimationFrame = clearTimeout;
    window['requestAnimationFrame'] = window.requestAnimationFrame;
    window['cancelAnimationFrame'] = window.cancelAnimationFrame;
}
/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
   * Class constructor for Button MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @param {HTMLElement} element The element that will be upgraded.
   */
var MaterialButton = function MaterialButton(element) {
    this.element_ = element;
    // Initialize instance.
    this.init();
};
window['MaterialButton'] = MaterialButton;
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
MaterialButton.prototype.Constant_ = {};
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialButton.prototype.CssClasses_ = {
    RIPPLE_EFFECT: 'mdl-js-ripple-effect',
    RIPPLE_CONTAINER: 'mdl-button__ripple-container',
    RIPPLE: 'mdl-ripple'
};
/**
   * Handle blur of element.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialButton.prototype.blurHandler_ = function (event) {
    if (event) {
        this.element_.blur();
    }
};
// Public methods.
/**
   * Disable button.
   *
   * @public
   */
MaterialButton.prototype.disable = function () {
    this.element_.disabled = true;
};
MaterialButton.prototype['disable'] = MaterialButton.prototype.disable;
/**
   * Enable button.
   *
   * @public
   */
MaterialButton.prototype.enable = function () {
    this.element_.disabled = false;
};
MaterialButton.prototype['enable'] = MaterialButton.prototype.enable;
/**
   * Initialize element.
   */
MaterialButton.prototype.init = function () {
    if (this.element_) {
        if (this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT)) {
            var rippleContainer = document.createElement('span');
            rippleContainer.classList.add(this.CssClasses_.RIPPLE_CONTAINER);
            this.rippleElement_ = document.createElement('span');
            this.rippleElement_.classList.add(this.CssClasses_.RIPPLE);
            rippleContainer.appendChild(this.rippleElement_);
            this.boundRippleBlurHandler = this.blurHandler_.bind(this);
            this.rippleElement_.addEventListener('mouseup', this.boundRippleBlurHandler);
            this.element_.appendChild(rippleContainer);
        }
        this.boundButtonBlurHandler = this.blurHandler_.bind(this);
        this.element_.addEventListener('mouseup', this.boundButtonBlurHandler);
        this.element_.addEventListener('mouseleave', this.boundButtonBlurHandler);
    }
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialButton,
    classAsString: 'MaterialButton',
    cssClass: 'mdl-js-button',
    widget: true
});
/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
   * Class constructor for Checkbox MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {HTMLElement} element The element that will be upgraded.
   */
var MaterialCheckbox = function MaterialCheckbox(element) {
    this.element_ = element;
    // Initialize instance.
    this.init();
};
window['MaterialCheckbox'] = MaterialCheckbox;
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
MaterialCheckbox.prototype.Constant_ = { TINY_TIMEOUT: 0.001 };
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialCheckbox.prototype.CssClasses_ = {
    INPUT: 'mdl-checkbox__input',
    BOX_OUTLINE: 'mdl-checkbox__box-outline',
    FOCUS_HELPER: 'mdl-checkbox__focus-helper',
    TICK_OUTLINE: 'mdl-checkbox__tick-outline',
    RIPPLE_EFFECT: 'mdl-js-ripple-effect',
    RIPPLE_IGNORE_EVENTS: 'mdl-js-ripple-effect--ignore-events',
    RIPPLE_CONTAINER: 'mdl-checkbox__ripple-container',
    RIPPLE_CENTER: 'mdl-ripple--center',
    RIPPLE: 'mdl-ripple',
    IS_FOCUSED: 'is-focused',
    IS_DISABLED: 'is-disabled',
    IS_CHECKED: 'is-checked',
    IS_UPGRADED: 'is-upgraded'
};
/**
   * Handle change of state.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialCheckbox.prototype.onChange_ = function (event) {
    this.updateClasses_();
};
/**
   * Handle focus of element.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialCheckbox.prototype.onFocus_ = function (event) {
    this.element_.classList.add(this.CssClasses_.IS_FOCUSED);
};
/**
   * Handle lost focus of element.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialCheckbox.prototype.onBlur_ = function (event) {
    this.element_.classList.remove(this.CssClasses_.IS_FOCUSED);
};
/**
   * Handle mouseup.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialCheckbox.prototype.onMouseUp_ = function (event) {
    this.blur_();
};
/**
   * Handle class updates.
   *
   * @private
   */
MaterialCheckbox.prototype.updateClasses_ = function () {
    this.checkDisabled();
    this.checkToggleState();
};
/**
   * Add blur.
   *
   * @private
   */
MaterialCheckbox.prototype.blur_ = function () {
    // TODO: figure out why there's a focus event being fired after our blur,
    // so that we can avoid this hack.
    window.setTimeout(function () {
        this.inputElement_.blur();
    }.bind(this), this.Constant_.TINY_TIMEOUT);
};
// Public methods.
/**
   * Check the inputs toggle state and update display.
   *
   * @public
   */
MaterialCheckbox.prototype.checkToggleState = function () {
    if (this.inputElement_.checked) {
        this.element_.classList.add(this.CssClasses_.IS_CHECKED);
    } else {
        this.element_.classList.remove(this.CssClasses_.IS_CHECKED);
    }
};
MaterialCheckbox.prototype['checkToggleState'] = MaterialCheckbox.prototype.checkToggleState;
/**
   * Check the inputs disabled state and update display.
   *
   * @public
   */
MaterialCheckbox.prototype.checkDisabled = function () {
    if (this.inputElement_.disabled) {
        this.element_.classList.add(this.CssClasses_.IS_DISABLED);
    } else {
        this.element_.classList.remove(this.CssClasses_.IS_DISABLED);
    }
};
MaterialCheckbox.prototype['checkDisabled'] = MaterialCheckbox.prototype.checkDisabled;
/**
   * Disable checkbox.
   *
   * @public
   */
MaterialCheckbox.prototype.disable = function () {
    this.inputElement_.disabled = true;
    this.updateClasses_();
};
MaterialCheckbox.prototype['disable'] = MaterialCheckbox.prototype.disable;
/**
   * Enable checkbox.
   *
   * @public
   */
MaterialCheckbox.prototype.enable = function () {
    this.inputElement_.disabled = false;
    this.updateClasses_();
};
MaterialCheckbox.prototype['enable'] = MaterialCheckbox.prototype.enable;
/**
   * Check checkbox.
   *
   * @public
   */
MaterialCheckbox.prototype.check = function () {
    this.inputElement_.checked = true;
    this.updateClasses_();
};
MaterialCheckbox.prototype['check'] = MaterialCheckbox.prototype.check;
/**
   * Uncheck checkbox.
   *
   * @public
   */
MaterialCheckbox.prototype.uncheck = function () {
    this.inputElement_.checked = false;
    this.updateClasses_();
};
MaterialCheckbox.prototype['uncheck'] = MaterialCheckbox.prototype.uncheck;
/**
   * Initialize element.
   */
MaterialCheckbox.prototype.init = function () {
    if (this.element_) {
        this.inputElement_ = this.element_.querySelector('.' + this.CssClasses_.INPUT);
        var boxOutline = document.createElement('span');
        boxOutline.classList.add(this.CssClasses_.BOX_OUTLINE);
        var tickContainer = document.createElement('span');
        tickContainer.classList.add(this.CssClasses_.FOCUS_HELPER);
        var tickOutline = document.createElement('span');
        tickOutline.classList.add(this.CssClasses_.TICK_OUTLINE);
        boxOutline.appendChild(tickOutline);
        this.element_.appendChild(tickContainer);
        this.element_.appendChild(boxOutline);
        if (this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT)) {
            this.element_.classList.add(this.CssClasses_.RIPPLE_IGNORE_EVENTS);
            this.rippleContainerElement_ = document.createElement('span');
            this.rippleContainerElement_.classList.add(this.CssClasses_.RIPPLE_CONTAINER);
            this.rippleContainerElement_.classList.add(this.CssClasses_.RIPPLE_EFFECT);
            this.rippleContainerElement_.classList.add(this.CssClasses_.RIPPLE_CENTER);
            this.boundRippleMouseUp = this.onMouseUp_.bind(this);
            this.rippleContainerElement_.addEventListener('mouseup', this.boundRippleMouseUp);
            var ripple = document.createElement('span');
            ripple.classList.add(this.CssClasses_.RIPPLE);
            this.rippleContainerElement_.appendChild(ripple);
            this.element_.appendChild(this.rippleContainerElement_);
        }
        this.boundInputOnChange = this.onChange_.bind(this);
        this.boundInputOnFocus = this.onFocus_.bind(this);
        this.boundInputOnBlur = this.onBlur_.bind(this);
        this.boundElementMouseUp = this.onMouseUp_.bind(this);
        this.inputElement_.addEventListener('change', this.boundInputOnChange);
        this.inputElement_.addEventListener('focus', this.boundInputOnFocus);
        this.inputElement_.addEventListener('blur', this.boundInputOnBlur);
        this.element_.addEventListener('mouseup', this.boundElementMouseUp);
        this.updateClasses_();
        this.element_.classList.add(this.CssClasses_.IS_UPGRADED);
    }
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialCheckbox,
    classAsString: 'MaterialCheckbox',
    cssClass: 'mdl-js-checkbox',
    widget: true
});
/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
   * Class constructor for icon toggle MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {HTMLElement} element The element that will be upgraded.
   */
var MaterialIconToggle = function MaterialIconToggle(element) {
    this.element_ = element;
    // Initialize instance.
    this.init();
};
window['MaterialIconToggle'] = MaterialIconToggle;
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
MaterialIconToggle.prototype.Constant_ = { TINY_TIMEOUT: 0.001 };
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialIconToggle.prototype.CssClasses_ = {
    INPUT: 'mdl-icon-toggle__input',
    JS_RIPPLE_EFFECT: 'mdl-js-ripple-effect',
    RIPPLE_IGNORE_EVENTS: 'mdl-js-ripple-effect--ignore-events',
    RIPPLE_CONTAINER: 'mdl-icon-toggle__ripple-container',
    RIPPLE_CENTER: 'mdl-ripple--center',
    RIPPLE: 'mdl-ripple',
    IS_FOCUSED: 'is-focused',
    IS_DISABLED: 'is-disabled',
    IS_CHECKED: 'is-checked'
};
/**
   * Handle change of state.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialIconToggle.prototype.onChange_ = function (event) {
    this.updateClasses_();
};
/**
   * Handle focus of element.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialIconToggle.prototype.onFocus_ = function (event) {
    this.element_.classList.add(this.CssClasses_.IS_FOCUSED);
};
/**
   * Handle lost focus of element.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialIconToggle.prototype.onBlur_ = function (event) {
    this.element_.classList.remove(this.CssClasses_.IS_FOCUSED);
};
/**
   * Handle mouseup.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialIconToggle.prototype.onMouseUp_ = function (event) {
    this.blur_();
};
/**
   * Handle class updates.
   *
   * @private
   */
MaterialIconToggle.prototype.updateClasses_ = function () {
    this.checkDisabled();
    this.checkToggleState();
};
/**
   * Add blur.
   *
   * @private
   */
MaterialIconToggle.prototype.blur_ = function () {
    // TODO: figure out why there's a focus event being fired after our blur,
    // so that we can avoid this hack.
    window.setTimeout(function () {
        this.inputElement_.blur();
    }.bind(this), this.Constant_.TINY_TIMEOUT);
};
// Public methods.
/**
   * Check the inputs toggle state and update display.
   *
   * @public
   */
MaterialIconToggle.prototype.checkToggleState = function () {
    if (this.inputElement_.checked) {
        this.element_.classList.add(this.CssClasses_.IS_CHECKED);
    } else {
        this.element_.classList.remove(this.CssClasses_.IS_CHECKED);
    }
};
MaterialIconToggle.prototype['checkToggleState'] = MaterialIconToggle.prototype.checkToggleState;
/**
   * Check the inputs disabled state and update display.
   *
   * @public
   */
MaterialIconToggle.prototype.checkDisabled = function () {
    if (this.inputElement_.disabled) {
        this.element_.classList.add(this.CssClasses_.IS_DISABLED);
    } else {
        this.element_.classList.remove(this.CssClasses_.IS_DISABLED);
    }
};
MaterialIconToggle.prototype['checkDisabled'] = MaterialIconToggle.prototype.checkDisabled;
/**
   * Disable icon toggle.
   *
   * @public
   */
MaterialIconToggle.prototype.disable = function () {
    this.inputElement_.disabled = true;
    this.updateClasses_();
};
MaterialIconToggle.prototype['disable'] = MaterialIconToggle.prototype.disable;
/**
   * Enable icon toggle.
   *
   * @public
   */
MaterialIconToggle.prototype.enable = function () {
    this.inputElement_.disabled = false;
    this.updateClasses_();
};
MaterialIconToggle.prototype['enable'] = MaterialIconToggle.prototype.enable;
/**
   * Check icon toggle.
   *
   * @public
   */
MaterialIconToggle.prototype.check = function () {
    this.inputElement_.checked = true;
    this.updateClasses_();
};
MaterialIconToggle.prototype['check'] = MaterialIconToggle.prototype.check;
/**
   * Uncheck icon toggle.
   *
   * @public
   */
MaterialIconToggle.prototype.uncheck = function () {
    this.inputElement_.checked = false;
    this.updateClasses_();
};
MaterialIconToggle.prototype['uncheck'] = MaterialIconToggle.prototype.uncheck;
/**
   * Initialize element.
   */
MaterialIconToggle.prototype.init = function () {
    if (this.element_) {
        this.inputElement_ = this.element_.querySelector('.' + this.CssClasses_.INPUT);
        if (this.element_.classList.contains(this.CssClasses_.JS_RIPPLE_EFFECT)) {
            this.element_.classList.add(this.CssClasses_.RIPPLE_IGNORE_EVENTS);
            this.rippleContainerElement_ = document.createElement('span');
            this.rippleContainerElement_.classList.add(this.CssClasses_.RIPPLE_CONTAINER);
            this.rippleContainerElement_.classList.add(this.CssClasses_.JS_RIPPLE_EFFECT);
            this.rippleContainerElement_.classList.add(this.CssClasses_.RIPPLE_CENTER);
            this.boundRippleMouseUp = this.onMouseUp_.bind(this);
            this.rippleContainerElement_.addEventListener('mouseup', this.boundRippleMouseUp);
            var ripple = document.createElement('span');
            ripple.classList.add(this.CssClasses_.RIPPLE);
            this.rippleContainerElement_.appendChild(ripple);
            this.element_.appendChild(this.rippleContainerElement_);
        }
        this.boundInputOnChange = this.onChange_.bind(this);
        this.boundInputOnFocus = this.onFocus_.bind(this);
        this.boundInputOnBlur = this.onBlur_.bind(this);
        this.boundElementOnMouseUp = this.onMouseUp_.bind(this);
        this.inputElement_.addEventListener('change', this.boundInputOnChange);
        this.inputElement_.addEventListener('focus', this.boundInputOnFocus);
        this.inputElement_.addEventListener('blur', this.boundInputOnBlur);
        this.element_.addEventListener('mouseup', this.boundElementOnMouseUp);
        this.updateClasses_();
        this.element_.classList.add('is-upgraded');
    }
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialIconToggle,
    classAsString: 'MaterialIconToggle',
    cssClass: 'mdl-js-icon-toggle',
    widget: true
});
/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
   * Class constructor for dropdown MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {HTMLElement} element The element that will be upgraded.
   */
var MaterialMenu = function MaterialMenu(element) {
    this.element_ = element;
    // Initialize instance.
    this.init();
};
window['MaterialMenu'] = MaterialMenu;
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
MaterialMenu.prototype.Constant_ = {
    // Total duration of the menu animation.
    TRANSITION_DURATION_SECONDS: 0.3,
    // The fraction of the total duration we want to use for menu item animations.
    TRANSITION_DURATION_FRACTION: 0.8,
    // How long the menu stays open after choosing an option (so the user can see
    // the ripple).
    CLOSE_TIMEOUT: 150
};
/**
   * Keycodes, for code readability.
   *
   * @enum {number}
   * @private
   */
MaterialMenu.prototype.Keycodes_ = {
    ENTER: 13,
    ESCAPE: 27,
    SPACE: 32,
    UP_ARROW: 38,
    DOWN_ARROW: 40
};
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialMenu.prototype.CssClasses_ = {
    CONTAINER: 'mdl-menu__container',
    OUTLINE: 'mdl-menu__outline',
    ITEM: 'mdl-menu__item',
    ITEM_RIPPLE_CONTAINER: 'mdl-menu__item-ripple-container',
    RIPPLE_EFFECT: 'mdl-js-ripple-effect',
    RIPPLE_IGNORE_EVENTS: 'mdl-js-ripple-effect--ignore-events',
    RIPPLE: 'mdl-ripple',
    // Statuses
    IS_UPGRADED: 'is-upgraded',
    IS_VISIBLE: 'is-visible',
    IS_ANIMATING: 'is-animating',
    // Alignment options
    BOTTOM_LEFT: 'mdl-menu--bottom-left',
    // This is the default.
    BOTTOM_RIGHT: 'mdl-menu--bottom-right',
    TOP_LEFT: 'mdl-menu--top-left',
    TOP_RIGHT: 'mdl-menu--top-right',
    UNALIGNED: 'mdl-menu--unaligned'
};
/**
   * Initialize element.
   */
MaterialMenu.prototype.init = function () {
    if (this.element_) {
        // Create container for the menu.
        var container = document.createElement('div');
        container.classList.add(this.CssClasses_.CONTAINER);
        this.element_.parentElement.insertBefore(container, this.element_);
        this.element_.parentElement.removeChild(this.element_);
        container.appendChild(this.element_);
        this.container_ = container;
        // Create outline for the menu (shadow and background).
        var outline = document.createElement('div');
        outline.classList.add(this.CssClasses_.OUTLINE);
        this.outline_ = outline;
        container.insertBefore(outline, this.element_);
        // Find the "for" element and bind events to it.
        var forElId = this.element_.getAttribute('for') || this.element_.getAttribute('data-mdl-for');
        var forEl = null;
        if (forElId) {
            forEl = document.getElementById(forElId);
            if (forEl) {
                this.forElement_ = forEl;
                forEl.addEventListener('click', this.handleForClick_.bind(this));
                forEl.addEventListener('keydown', this.handleForKeyboardEvent_.bind(this));
            }
        }
        var items = this.element_.querySelectorAll('.' + this.CssClasses_.ITEM);
        this.boundItemKeydown_ = this.handleItemKeyboardEvent_.bind(this);
        this.boundItemClick_ = this.handleItemClick_.bind(this);
        for (var i = 0; i < items.length; i++) {
            // Add a listener to each menu item.
            items[i].addEventListener('click', this.boundItemClick_);
            // Add a tab index to each menu item.
            items[i].tabIndex = '-1';
            // Add a keyboard listener to each menu item.
            items[i].addEventListener('keydown', this.boundItemKeydown_);
        }
        // Add ripple classes to each item, if the user has enabled ripples.
        if (this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT)) {
            this.element_.classList.add(this.CssClasses_.RIPPLE_IGNORE_EVENTS);
            for (i = 0; i < items.length; i++) {
                var item = items[i];
                var rippleContainer = document.createElement('span');
                rippleContainer.classList.add(this.CssClasses_.ITEM_RIPPLE_CONTAINER);
                var ripple = document.createElement('span');
                ripple.classList.add(this.CssClasses_.RIPPLE);
                rippleContainer.appendChild(ripple);
                item.appendChild(rippleContainer);
                item.classList.add(this.CssClasses_.RIPPLE_EFFECT);
            }
        }
        // Copy alignment classes to the container, so the outline can use them.
        if (this.element_.classList.contains(this.CssClasses_.BOTTOM_LEFT)) {
            this.outline_.classList.add(this.CssClasses_.BOTTOM_LEFT);
        }
        if (this.element_.classList.contains(this.CssClasses_.BOTTOM_RIGHT)) {
            this.outline_.classList.add(this.CssClasses_.BOTTOM_RIGHT);
        }
        if (this.element_.classList.contains(this.CssClasses_.TOP_LEFT)) {
            this.outline_.classList.add(this.CssClasses_.TOP_LEFT);
        }
        if (this.element_.classList.contains(this.CssClasses_.TOP_RIGHT)) {
            this.outline_.classList.add(this.CssClasses_.TOP_RIGHT);
        }
        if (this.element_.classList.contains(this.CssClasses_.UNALIGNED)) {
            this.outline_.classList.add(this.CssClasses_.UNALIGNED);
        }
        container.classList.add(this.CssClasses_.IS_UPGRADED);
    }
};
/**
   * Handles a click on the "for" element, by positioning the menu and then
   * toggling it.
   *
   * @param {Event} evt The event that fired.
   * @private
   */
MaterialMenu.prototype.handleForClick_ = function (evt) {
    if (this.element_ && this.forElement_) {
        var rect = this.forElement_.getBoundingClientRect();
        var forRect = this.forElement_.parentElement.getBoundingClientRect();
        if (this.element_.classList.contains(this.CssClasses_.UNALIGNED)) {
        } else if (this.element_.classList.contains(this.CssClasses_.BOTTOM_RIGHT)) {
            // Position below the "for" element, aligned to its right.
            this.container_.style.right = forRect.right - rect.right + 'px';
            this.container_.style.top = this.forElement_.offsetTop + this.forElement_.offsetHeight + 'px';
        } else if (this.element_.classList.contains(this.CssClasses_.TOP_LEFT)) {
            // Position above the "for" element, aligned to its left.
            this.container_.style.left = this.forElement_.offsetLeft + 'px';
            this.container_.style.bottom = forRect.bottom - rect.top + 'px';
        } else if (this.element_.classList.contains(this.CssClasses_.TOP_RIGHT)) {
            // Position above the "for" element, aligned to its right.
            this.container_.style.right = forRect.right - rect.right + 'px';
            this.container_.style.bottom = forRect.bottom - rect.top + 'px';
        } else {
            // Default: position below the "for" element, aligned to its left.
            this.container_.style.left = this.forElement_.offsetLeft + 'px';
            this.container_.style.top = this.forElement_.offsetTop + this.forElement_.offsetHeight + 'px';
        }
    }
    this.toggle(evt);
};
/**
   * Handles a keyboard event on the "for" element.
   *
   * @param {Event} evt The event that fired.
   * @private
   */
MaterialMenu.prototype.handleForKeyboardEvent_ = function (evt) {
    if (this.element_ && this.container_ && this.forElement_) {
        var items = this.element_.querySelectorAll('.' + this.CssClasses_.ITEM + ':not([disabled])');
        if (items && items.length > 0 && this.container_.classList.contains(this.CssClasses_.IS_VISIBLE)) {
            if (evt.keyCode === this.Keycodes_.UP_ARROW) {
                evt.preventDefault();
                items[items.length - 1].focus();
            } else if (evt.keyCode === this.Keycodes_.DOWN_ARROW) {
                evt.preventDefault();
                items[0].focus();
            }
        }
    }
};
/**
   * Handles a keyboard event on an item.
   *
   * @param {Event} evt The event that fired.
   * @private
   */
MaterialMenu.prototype.handleItemKeyboardEvent_ = function (evt) {
    if (this.element_ && this.container_) {
        var items = this.element_.querySelectorAll('.' + this.CssClasses_.ITEM + ':not([disabled])');
        if (items && items.length > 0 && this.container_.classList.contains(this.CssClasses_.IS_VISIBLE)) {
            var currentIndex = Array.prototype.slice.call(items).indexOf(evt.target);
            if (evt.keyCode === this.Keycodes_.UP_ARROW) {
                evt.preventDefault();
                if (currentIndex > 0) {
                    items[currentIndex - 1].focus();
                } else {
                    items[items.length - 1].focus();
                }
            } else if (evt.keyCode === this.Keycodes_.DOWN_ARROW) {
                evt.preventDefault();
                if (items.length > currentIndex + 1) {
                    items[currentIndex + 1].focus();
                } else {
                    items[0].focus();
                }
            } else if (evt.keyCode === this.Keycodes_.SPACE || evt.keyCode === this.Keycodes_.ENTER) {
                evt.preventDefault();
                // Send mousedown and mouseup to trigger ripple.
                var e = new MouseEvent('mousedown');
                evt.target.dispatchEvent(e);
                e = new MouseEvent('mouseup');
                evt.target.dispatchEvent(e);
                // Send click.
                evt.target.click();
            } else if (evt.keyCode === this.Keycodes_.ESCAPE) {
                evt.preventDefault();
                this.hide();
            }
        }
    }
};
/**
   * Handles a click event on an item.
   *
   * @param {Event} evt The event that fired.
   * @private
   */
MaterialMenu.prototype.handleItemClick_ = function (evt) {
    if (evt.target.hasAttribute('disabled')) {
        evt.stopPropagation();
    } else {
        // Wait some time before closing menu, so the user can see the ripple.
        this.closing_ = true;
        window.setTimeout(function (evt) {
            this.hide();
            this.closing_ = false;
        }.bind(this), this.Constant_.CLOSE_TIMEOUT);
    }
};
/**
   * Calculates the initial clip (for opening the menu) or final clip (for closing
   * it), and applies it. This allows us to animate from or to the correct point,
   * that is, the point it's aligned to in the "for" element.
   *
   * @param {number} height Height of the clip rectangle
   * @param {number} width Width of the clip rectangle
   * @private
   */
MaterialMenu.prototype.applyClip_ = function (height, width) {
    if (this.element_.classList.contains(this.CssClasses_.UNALIGNED)) {
        // Do not clip.
        this.element_.style.clip = '';
    } else if (this.element_.classList.contains(this.CssClasses_.BOTTOM_RIGHT)) {
        // Clip to the top right corner of the menu.
        this.element_.style.clip = 'rect(0 ' + width + 'px ' + '0 ' + width + 'px)';
    } else if (this.element_.classList.contains(this.CssClasses_.TOP_LEFT)) {
        // Clip to the bottom left corner of the menu.
        this.element_.style.clip = 'rect(' + height + 'px 0 ' + height + 'px 0)';
    } else if (this.element_.classList.contains(this.CssClasses_.TOP_RIGHT)) {
        // Clip to the bottom right corner of the menu.
        this.element_.style.clip = 'rect(' + height + 'px ' + width + 'px ' + height + 'px ' + width + 'px)';
    } else {
        // Default: do not clip (same as clipping to the top left corner).
        this.element_.style.clip = '';
    }
};
/**
   * Cleanup function to remove animation listeners.
   *
   * @param {Event} evt
   * @private
   */
MaterialMenu.prototype.removeAnimationEndListener_ = function (evt) {
    evt.target.classList.remove(MaterialMenu.prototype.CssClasses_.IS_ANIMATING);
};
/**
   * Adds an event listener to clean up after the animation ends.
   *
   * @private
   */
MaterialMenu.prototype.addAnimationEndListener_ = function () {
    this.element_.addEventListener('transitionend', this.removeAnimationEndListener_);
    this.element_.addEventListener('webkitTransitionEnd', this.removeAnimationEndListener_);
};
/**
   * Displays the menu.
   *
   * @public
   */
MaterialMenu.prototype.show = function (evt) {
    if (this.element_ && this.container_ && this.outline_) {
        // Measure the inner element.
        var height = this.element_.getBoundingClientRect().height;
        var width = this.element_.getBoundingClientRect().width;
        // Apply the inner element's size to the container and outline.
        this.container_.style.width = width + 'px';
        this.container_.style.height = height + 'px';
        this.outline_.style.width = width + 'px';
        this.outline_.style.height = height + 'px';
        var transitionDuration = this.Constant_.TRANSITION_DURATION_SECONDS * this.Constant_.TRANSITION_DURATION_FRACTION;
        // Calculate transition delays for individual menu items, so that they fade
        // in one at a time.
        var items = this.element_.querySelectorAll('.' + this.CssClasses_.ITEM);
        for (var i = 0; i < items.length; i++) {
            var itemDelay = null;
            if (this.element_.classList.contains(this.CssClasses_.TOP_LEFT) || this.element_.classList.contains(this.CssClasses_.TOP_RIGHT)) {
                itemDelay = (height - items[i].offsetTop - items[i].offsetHeight) / height * transitionDuration + 's';
            } else {
                itemDelay = items[i].offsetTop / height * transitionDuration + 's';
            }
            items[i].style.transitionDelay = itemDelay;
        }
        // Apply the initial clip to the text before we start animating.
        this.applyClip_(height, width);
        // Wait for the next frame, turn on animation, and apply the final clip.
        // Also make it visible. This triggers the transitions.
        window.requestAnimationFrame(function () {
            this.element_.classList.add(this.CssClasses_.IS_ANIMATING);
            this.element_.style.clip = 'rect(0 ' + width + 'px ' + height + 'px 0)';
            this.container_.classList.add(this.CssClasses_.IS_VISIBLE);
        }.bind(this));
        // Clean up after the animation is complete.
        this.addAnimationEndListener_();
        // Add a click listener to the document, to close the menu.
        var callback = function (e) {
            // Check to see if the document is processing the same event that
            // displayed the menu in the first place. If so, do nothing.
            // Also check to see if the menu is in the process of closing itself, and
            // do nothing in that case.
            // Also check if the clicked element is a menu item
            // if so, do nothing.
            if (e !== evt && !this.closing_ && e.target.parentNode !== this.element_) {
                document.removeEventListener('click', callback);
                this.hide();
            }
        }.bind(this);
        document.addEventListener('click', callback);
    }
};
MaterialMenu.prototype['show'] = MaterialMenu.prototype.show;
/**
   * Hides the menu.
   *
   * @public
   */
MaterialMenu.prototype.hide = function () {
    if (this.element_ && this.container_ && this.outline_) {
        var items = this.element_.querySelectorAll('.' + this.CssClasses_.ITEM);
        // Remove all transition delays; menu items fade out concurrently.
        for (var i = 0; i < items.length; i++) {
            items[i].style.removeProperty('transition-delay');
        }
        // Measure the inner element.
        var rect = this.element_.getBoundingClientRect();
        var height = rect.height;
        var width = rect.width;
        // Turn on animation, and apply the final clip. Also make invisible.
        // This triggers the transitions.
        this.element_.classList.add(this.CssClasses_.IS_ANIMATING);
        this.applyClip_(height, width);
        this.container_.classList.remove(this.CssClasses_.IS_VISIBLE);
        // Clean up after the animation is complete.
        this.addAnimationEndListener_();
    }
};
MaterialMenu.prototype['hide'] = MaterialMenu.prototype.hide;
/**
   * Displays or hides the menu, depending on current state.
   *
   * @public
   */
MaterialMenu.prototype.toggle = function (evt) {
    if (this.container_.classList.contains(this.CssClasses_.IS_VISIBLE)) {
        this.hide();
    } else {
        this.show(evt);
    }
};
MaterialMenu.prototype['toggle'] = MaterialMenu.prototype.toggle;
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialMenu,
    classAsString: 'MaterialMenu',
    cssClass: 'mdl-js-menu',
    widget: true
});
/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
   * Class constructor for Progress MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {HTMLElement} element The element that will be upgraded.
   */
var MaterialProgress = function MaterialProgress(element) {
    this.element_ = element;
    // Initialize instance.
    this.init();
};
window['MaterialProgress'] = MaterialProgress;
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
MaterialProgress.prototype.Constant_ = {};
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialProgress.prototype.CssClasses_ = { INDETERMINATE_CLASS: 'mdl-progress__indeterminate' };
/**
   * Set the current progress of the progressbar.
   *
   * @param {number} p Percentage of the progress (0-100)
   * @public
   */
MaterialProgress.prototype.setProgress = function (p) {
    if (this.element_.classList.contains(this.CssClasses_.INDETERMINATE_CLASS)) {
        return;
    }
    this.progressbar_.style.width = p + '%';
};
MaterialProgress.prototype['setProgress'] = MaterialProgress.prototype.setProgress;
/**
   * Set the current progress of the buffer.
   *
   * @param {number} p Percentage of the buffer (0-100)
   * @public
   */
MaterialProgress.prototype.setBuffer = function (p) {
    this.bufferbar_.style.width = p + '%';
    this.auxbar_.style.width = 100 - p + '%';
};
MaterialProgress.prototype['setBuffer'] = MaterialProgress.prototype.setBuffer;
/**
   * Initialize element.
   */
MaterialProgress.prototype.init = function () {
    if (this.element_) {
        var el = document.createElement('div');
        el.className = 'progressbar bar bar1';
        this.element_.appendChild(el);
        this.progressbar_ = el;
        el = document.createElement('div');
        el.className = 'bufferbar bar bar2';
        this.element_.appendChild(el);
        this.bufferbar_ = el;
        el = document.createElement('div');
        el.className = 'auxbar bar bar3';
        this.element_.appendChild(el);
        this.auxbar_ = el;
        this.progressbar_.style.width = '0%';
        this.bufferbar_.style.width = '100%';
        this.auxbar_.style.width = '0%';
        this.element_.classList.add('is-upgraded');
    }
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialProgress,
    classAsString: 'MaterialProgress',
    cssClass: 'mdl-js-progress',
    widget: true
});
/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
   * Class constructor for Radio MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {HTMLElement} element The element that will be upgraded.
   */
var MaterialRadio = function MaterialRadio(element) {
    this.element_ = element;
    // Initialize instance.
    this.init();
};
window['MaterialRadio'] = MaterialRadio;
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
MaterialRadio.prototype.Constant_ = { TINY_TIMEOUT: 0.001 };
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialRadio.prototype.CssClasses_ = {
    IS_FOCUSED: 'is-focused',
    IS_DISABLED: 'is-disabled',
    IS_CHECKED: 'is-checked',
    IS_UPGRADED: 'is-upgraded',
    JS_RADIO: 'mdl-js-radio',
    RADIO_BTN: 'mdl-radio__button',
    RADIO_OUTER_CIRCLE: 'mdl-radio__outer-circle',
    RADIO_INNER_CIRCLE: 'mdl-radio__inner-circle',
    RIPPLE_EFFECT: 'mdl-js-ripple-effect',
    RIPPLE_IGNORE_EVENTS: 'mdl-js-ripple-effect--ignore-events',
    RIPPLE_CONTAINER: 'mdl-radio__ripple-container',
    RIPPLE_CENTER: 'mdl-ripple--center',
    RIPPLE: 'mdl-ripple'
};
/**
   * Handle change of state.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialRadio.prototype.onChange_ = function (event) {
    // Since other radio buttons don't get change events, we need to look for
    // them to update their classes.
    var radios = document.getElementsByClassName(this.CssClasses_.JS_RADIO);
    for (var i = 0; i < radios.length; i++) {
        var button = radios[i].querySelector('.' + this.CssClasses_.RADIO_BTN);
        // Different name == different group, so no point updating those.
        if (button.getAttribute('name') === this.btnElement_.getAttribute('name')) {
            radios[i]['MaterialRadio'].updateClasses_();
        }
    }
};
/**
   * Handle focus.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialRadio.prototype.onFocus_ = function (event) {
    this.element_.classList.add(this.CssClasses_.IS_FOCUSED);
};
/**
   * Handle lost focus.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialRadio.prototype.onBlur_ = function (event) {
    this.element_.classList.remove(this.CssClasses_.IS_FOCUSED);
};
/**
   * Handle mouseup.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialRadio.prototype.onMouseup_ = function (event) {
    this.blur_();
};
/**
   * Update classes.
   *
   * @private
   */
MaterialRadio.prototype.updateClasses_ = function () {
    this.checkDisabled();
    this.checkToggleState();
};
/**
   * Add blur.
   *
   * @private
   */
MaterialRadio.prototype.blur_ = function () {
    // TODO: figure out why there's a focus event being fired after our blur,
    // so that we can avoid this hack.
    window.setTimeout(function () {
        this.btnElement_.blur();
    }.bind(this), this.Constant_.TINY_TIMEOUT);
};
// Public methods.
/**
   * Check the components disabled state.
   *
   * @public
   */
MaterialRadio.prototype.checkDisabled = function () {
    if (this.btnElement_.disabled) {
        this.element_.classList.add(this.CssClasses_.IS_DISABLED);
    } else {
        this.element_.classList.remove(this.CssClasses_.IS_DISABLED);
    }
};
MaterialRadio.prototype['checkDisabled'] = MaterialRadio.prototype.checkDisabled;
/**
   * Check the components toggled state.
   *
   * @public
   */
MaterialRadio.prototype.checkToggleState = function () {
    if (this.btnElement_.checked) {
        this.element_.classList.add(this.CssClasses_.IS_CHECKED);
    } else {
        this.element_.classList.remove(this.CssClasses_.IS_CHECKED);
    }
};
MaterialRadio.prototype['checkToggleState'] = MaterialRadio.prototype.checkToggleState;
/**
   * Disable radio.
   *
   * @public
   */
MaterialRadio.prototype.disable = function () {
    this.btnElement_.disabled = true;
    this.updateClasses_();
};
MaterialRadio.prototype['disable'] = MaterialRadio.prototype.disable;
/**
   * Enable radio.
   *
   * @public
   */
MaterialRadio.prototype.enable = function () {
    this.btnElement_.disabled = false;
    this.updateClasses_();
};
MaterialRadio.prototype['enable'] = MaterialRadio.prototype.enable;
/**
   * Check radio.
   *
   * @public
   */
MaterialRadio.prototype.check = function () {
    this.btnElement_.checked = true;
    this.updateClasses_();
};
MaterialRadio.prototype['check'] = MaterialRadio.prototype.check;
/**
   * Uncheck radio.
   *
   * @public
   */
MaterialRadio.prototype.uncheck = function () {
    this.btnElement_.checked = false;
    this.updateClasses_();
};
MaterialRadio.prototype['uncheck'] = MaterialRadio.prototype.uncheck;
/**
   * Initialize element.
   */
MaterialRadio.prototype.init = function () {
    if (this.element_) {
        this.btnElement_ = this.element_.querySelector('.' + this.CssClasses_.RADIO_BTN);
        this.boundChangeHandler_ = this.onChange_.bind(this);
        this.boundFocusHandler_ = this.onChange_.bind(this);
        this.boundBlurHandler_ = this.onBlur_.bind(this);
        this.boundMouseUpHandler_ = this.onMouseup_.bind(this);
        var outerCircle = document.createElement('span');
        outerCircle.classList.add(this.CssClasses_.RADIO_OUTER_CIRCLE);
        var innerCircle = document.createElement('span');
        innerCircle.classList.add(this.CssClasses_.RADIO_INNER_CIRCLE);
        this.element_.appendChild(outerCircle);
        this.element_.appendChild(innerCircle);
        var rippleContainer;
        if (this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT)) {
            this.element_.classList.add(this.CssClasses_.RIPPLE_IGNORE_EVENTS);
            rippleContainer = document.createElement('span');
            rippleContainer.classList.add(this.CssClasses_.RIPPLE_CONTAINER);
            rippleContainer.classList.add(this.CssClasses_.RIPPLE_EFFECT);
            rippleContainer.classList.add(this.CssClasses_.RIPPLE_CENTER);
            rippleContainer.addEventListener('mouseup', this.boundMouseUpHandler_);
            var ripple = document.createElement('span');
            ripple.classList.add(this.CssClasses_.RIPPLE);
            rippleContainer.appendChild(ripple);
            this.element_.appendChild(rippleContainer);
        }
        this.btnElement_.addEventListener('change', this.boundChangeHandler_);
        this.btnElement_.addEventListener('focus', this.boundFocusHandler_);
        this.btnElement_.addEventListener('blur', this.boundBlurHandler_);
        this.element_.addEventListener('mouseup', this.boundMouseUpHandler_);
        this.updateClasses_();
        this.element_.classList.add(this.CssClasses_.IS_UPGRADED);
    }
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialRadio,
    classAsString: 'MaterialRadio',
    cssClass: 'mdl-js-radio',
    widget: true
});
/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
   * Class constructor for Slider MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {HTMLElement} element The element that will be upgraded.
   */
var MaterialSlider = function MaterialSlider(element) {
    this.element_ = element;
    // Browser feature detection.
    this.isIE_ = window.navigator.msPointerEnabled;
    // Initialize instance.
    this.init();
};
window['MaterialSlider'] = MaterialSlider;
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
MaterialSlider.prototype.Constant_ = {};
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialSlider.prototype.CssClasses_ = {
    IE_CONTAINER: 'mdl-slider__ie-container',
    SLIDER_CONTAINER: 'mdl-slider__container',
    BACKGROUND_FLEX: 'mdl-slider__background-flex',
    BACKGROUND_LOWER: 'mdl-slider__background-lower',
    BACKGROUND_UPPER: 'mdl-slider__background-upper',
    IS_LOWEST_VALUE: 'is-lowest-value',
    IS_UPGRADED: 'is-upgraded'
};
/**
   * Handle input on element.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialSlider.prototype.onInput_ = function (event) {
    this.updateValueStyles_();
};
/**
   * Handle change on element.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialSlider.prototype.onChange_ = function (event) {
    this.updateValueStyles_();
};
/**
   * Handle mouseup on element.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialSlider.prototype.onMouseUp_ = function (event) {
    event.target.blur();
};
/**
   * Handle mousedown on container element.
   * This handler is purpose is to not require the use to click
   * exactly on the 2px slider element, as FireFox seems to be very
   * strict about this.
   *
   * @param {Event} event The event that fired.
   * @private
   * @suppress {missingProperties}
   */
MaterialSlider.prototype.onContainerMouseDown_ = function (event) {
    // If this click is not on the parent element (but rather some child)
    // ignore. It may still bubble up.
    if (event.target !== this.element_.parentElement) {
        return;
    }
    // Discard the original event and create a new event that
    // is on the slider element.
    event.preventDefault();
    var newEvent = new MouseEvent('mousedown', {
        target: event.target,
        buttons: event.buttons,
        clientX: event.clientX,
        clientY: this.element_.getBoundingClientRect().y
    });
    this.element_.dispatchEvent(newEvent);
};
/**
   * Handle updating of values.
   *
   * @private
   */
MaterialSlider.prototype.updateValueStyles_ = function () {
    // Calculate and apply percentages to div structure behind slider.
    var fraction = (this.element_.value - this.element_.min) / (this.element_.max - this.element_.min);
    if (fraction === 0) {
        this.element_.classList.add(this.CssClasses_.IS_LOWEST_VALUE);
    } else {
        this.element_.classList.remove(this.CssClasses_.IS_LOWEST_VALUE);
    }
    if (!this.isIE_) {
        this.backgroundLower_.style.flex = fraction;
        this.backgroundLower_.style.webkitFlex = fraction;
        this.backgroundUpper_.style.flex = 1 - fraction;
        this.backgroundUpper_.style.webkitFlex = 1 - fraction;
    }
};
// Public methods.
/**
   * Disable slider.
   *
   * @public
   */
MaterialSlider.prototype.disable = function () {
    this.element_.disabled = true;
};
MaterialSlider.prototype['disable'] = MaterialSlider.prototype.disable;
/**
   * Enable slider.
   *
   * @public
   */
MaterialSlider.prototype.enable = function () {
    this.element_.disabled = false;
};
MaterialSlider.prototype['enable'] = MaterialSlider.prototype.enable;
/**
   * Update slider value.
   *
   * @param {number} value The value to which to set the control (optional).
   * @public
   */
MaterialSlider.prototype.change = function (value) {
    if (typeof value !== 'undefined') {
        this.element_.value = value;
    }
    this.updateValueStyles_();
};
MaterialSlider.prototype['change'] = MaterialSlider.prototype.change;
/**
   * Initialize element.
   */
MaterialSlider.prototype.init = function () {
    if (this.element_) {
        if (this.isIE_) {
            // Since we need to specify a very large height in IE due to
            // implementation limitations, we add a parent here that trims it down to
            // a reasonable size.
            var containerIE = document.createElement('div');
            containerIE.classList.add(this.CssClasses_.IE_CONTAINER);
            this.element_.parentElement.insertBefore(containerIE, this.element_);
            this.element_.parentElement.removeChild(this.element_);
            containerIE.appendChild(this.element_);
        } else {
            // For non-IE browsers, we need a div structure that sits behind the
            // slider and allows us to style the left and right sides of it with
            // different colors.
            var container = document.createElement('div');
            container.classList.add(this.CssClasses_.SLIDER_CONTAINER);
            this.element_.parentElement.insertBefore(container, this.element_);
            this.element_.parentElement.removeChild(this.element_);
            container.appendChild(this.element_);
            var backgroundFlex = document.createElement('div');
            backgroundFlex.classList.add(this.CssClasses_.BACKGROUND_FLEX);
            container.appendChild(backgroundFlex);
            this.backgroundLower_ = document.createElement('div');
            this.backgroundLower_.classList.add(this.CssClasses_.BACKGROUND_LOWER);
            backgroundFlex.appendChild(this.backgroundLower_);
            this.backgroundUpper_ = document.createElement('div');
            this.backgroundUpper_.classList.add(this.CssClasses_.BACKGROUND_UPPER);
            backgroundFlex.appendChild(this.backgroundUpper_);
        }
        this.boundInputHandler = this.onInput_.bind(this);
        this.boundChangeHandler = this.onChange_.bind(this);
        this.boundMouseUpHandler = this.onMouseUp_.bind(this);
        this.boundContainerMouseDownHandler = this.onContainerMouseDown_.bind(this);
        this.element_.addEventListener('input', this.boundInputHandler);
        this.element_.addEventListener('change', this.boundChangeHandler);
        this.element_.addEventListener('mouseup', this.boundMouseUpHandler);
        this.element_.parentElement.addEventListener('mousedown', this.boundContainerMouseDownHandler);
        this.updateValueStyles_();
        this.element_.classList.add(this.CssClasses_.IS_UPGRADED);
    }
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialSlider,
    classAsString: 'MaterialSlider',
    cssClass: 'mdl-js-slider',
    widget: true
});
/**
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
   * Class constructor for Snackbar MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {HTMLElement} element The element that will be upgraded.
   */
var MaterialSnackbar = function MaterialSnackbar(element) {
    this.element_ = element;
    this.textElement_ = this.element_.querySelector('.' + this.cssClasses_.MESSAGE);
    this.actionElement_ = this.element_.querySelector('.' + this.cssClasses_.ACTION);
    if (!this.textElement_) {
        throw new Error('There must be a message element for a snackbar.');
    }
    if (!this.actionElement_) {
        throw new Error('There must be an action element for a snackbar.');
    }
    this.active = false;
    this.actionHandler_ = undefined;
    this.message_ = undefined;
    this.actionText_ = undefined;
    this.queuedNotifications_ = [];
    this.setActionHidden_(true);
};
window['MaterialSnackbar'] = MaterialSnackbar;
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
MaterialSnackbar.prototype.Constant_ = {
    // The duration of the snackbar show/hide animation, in ms.
    ANIMATION_LENGTH: 250
};
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialSnackbar.prototype.cssClasses_ = {
    SNACKBAR: 'mdl-snackbar',
    MESSAGE: 'mdl-snackbar__text',
    ACTION: 'mdl-snackbar__action',
    ACTIVE: 'mdl-snackbar--active'
};
/**
   * Display the snackbar.
   *
   * @private
   */
MaterialSnackbar.prototype.displaySnackbar_ = function () {
    this.element_.setAttribute('aria-hidden', 'true');
    if (this.actionHandler_) {
        this.actionElement_.textContent = this.actionText_;
        this.actionElement_.addEventListener('click', this.actionHandler_);
        this.setActionHidden_(false);
    }
    this.textElement_.textContent = this.message_;
    this.element_.classList.add(this.cssClasses_.ACTIVE);
    this.element_.setAttribute('aria-hidden', 'false');
    setTimeout(this.cleanup_.bind(this), this.timeout_);
};
/**
   * Show the snackbar.
   *
   * @param {Object} data The data for the notification.
   * @public
   */
MaterialSnackbar.prototype.showSnackbar = function (data) {
    if (data === undefined) {
        throw new Error('Please provide a data object with at least a message to display.');
    }
    if (data['message'] === undefined) {
        throw new Error('Please provide a message to be displayed.');
    }
    if (data['actionHandler'] && !data['actionText']) {
        throw new Error('Please provide action text with the handler.');
    }
    if (this.active) {
        this.queuedNotifications_.push(data);
    } else {
        this.active = true;
        this.message_ = data['message'];
        if (data['timeout']) {
            this.timeout_ = data['timeout'];
        } else {
            this.timeout_ = 2750;
        }
        if (data['actionHandler']) {
            this.actionHandler_ = data['actionHandler'];
        }
        if (data['actionText']) {
            this.actionText_ = data['actionText'];
        }
        this.displaySnackbar_();
    }
};
MaterialSnackbar.prototype['showSnackbar'] = MaterialSnackbar.prototype.showSnackbar;
/**
   * Check if the queue has items within it.
   * If it does, display the next entry.
   *
   * @private
   */
MaterialSnackbar.prototype.checkQueue_ = function () {
    if (this.queuedNotifications_.length > 0) {
        this.showSnackbar(this.queuedNotifications_.shift());
    }
};
/**
   * Cleanup the snackbar event listeners and accessiblity attributes.
   *
   * @private
   */
MaterialSnackbar.prototype.cleanup_ = function () {
    this.element_.classList.remove(this.cssClasses_.ACTIVE);
    setTimeout(function () {
        this.element_.setAttribute('aria-hidden', 'true');
        this.textElement_.textContent = '';
        if (!Boolean(this.actionElement_.getAttribute('aria-hidden'))) {
            this.setActionHidden_(true);
            this.actionElement_.textContent = '';
            this.actionElement_.removeEventListener('click', this.actionHandler_);
        }
        this.actionHandler_ = undefined;
        this.message_ = undefined;
        this.actionText_ = undefined;
        this.active = false;
        this.checkQueue_();
    }.bind(this), this.Constant_.ANIMATION_LENGTH);
};
/**
   * Set the action handler hidden state.
   *
   * @param {boolean} value
   * @private
   */
MaterialSnackbar.prototype.setActionHidden_ = function (value) {
    if (value) {
        this.actionElement_.setAttribute('aria-hidden', 'true');
    } else {
        this.actionElement_.removeAttribute('aria-hidden');
    }
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialSnackbar,
    classAsString: 'MaterialSnackbar',
    cssClass: 'mdl-js-snackbar',
    widget: true
});
/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
   * Class constructor for Spinner MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @param {HTMLElement} element The element that will be upgraded.
   * @constructor
   */
var MaterialSpinner = function MaterialSpinner(element) {
    this.element_ = element;
    // Initialize instance.
    this.init();
};
window['MaterialSpinner'] = MaterialSpinner;
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
MaterialSpinner.prototype.Constant_ = { MDL_SPINNER_LAYER_COUNT: 4 };
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialSpinner.prototype.CssClasses_ = {
    MDL_SPINNER_LAYER: 'mdl-spinner__layer',
    MDL_SPINNER_CIRCLE_CLIPPER: 'mdl-spinner__circle-clipper',
    MDL_SPINNER_CIRCLE: 'mdl-spinner__circle',
    MDL_SPINNER_GAP_PATCH: 'mdl-spinner__gap-patch',
    MDL_SPINNER_LEFT: 'mdl-spinner__left',
    MDL_SPINNER_RIGHT: 'mdl-spinner__right'
};
/**
   * Auxiliary method to create a spinner layer.
   *
   * @param {number} index Index of the layer to be created.
   * @public
   */
MaterialSpinner.prototype.createLayer = function (index) {
    var layer = document.createElement('div');
    layer.classList.add(this.CssClasses_.MDL_SPINNER_LAYER);
    layer.classList.add(this.CssClasses_.MDL_SPINNER_LAYER + '-' + index);
    var leftClipper = document.createElement('div');
    leftClipper.classList.add(this.CssClasses_.MDL_SPINNER_CIRCLE_CLIPPER);
    leftClipper.classList.add(this.CssClasses_.MDL_SPINNER_LEFT);
    var gapPatch = document.createElement('div');
    gapPatch.classList.add(this.CssClasses_.MDL_SPINNER_GAP_PATCH);
    var rightClipper = document.createElement('div');
    rightClipper.classList.add(this.CssClasses_.MDL_SPINNER_CIRCLE_CLIPPER);
    rightClipper.classList.add(this.CssClasses_.MDL_SPINNER_RIGHT);
    var circleOwners = [
        leftClipper,
        gapPatch,
        rightClipper
    ];
    for (var i = 0; i < circleOwners.length; i++) {
        var circle = document.createElement('div');
        circle.classList.add(this.CssClasses_.MDL_SPINNER_CIRCLE);
        circleOwners[i].appendChild(circle);
    }
    layer.appendChild(leftClipper);
    layer.appendChild(gapPatch);
    layer.appendChild(rightClipper);
    this.element_.appendChild(layer);
};
MaterialSpinner.prototype['createLayer'] = MaterialSpinner.prototype.createLayer;
/**
   * Stops the spinner animation.
   * Public method for users who need to stop the spinner for any reason.
   *
   * @public
   */
MaterialSpinner.prototype.stop = function () {
    this.element_.classList.remove('is-active');
};
MaterialSpinner.prototype['stop'] = MaterialSpinner.prototype.stop;
/**
   * Starts the spinner animation.
   * Public method for users who need to manually start the spinner for any reason
   * (instead of just adding the 'is-active' class to their markup).
   *
   * @public
   */
MaterialSpinner.prototype.start = function () {
    this.element_.classList.add('is-active');
};
MaterialSpinner.prototype['start'] = MaterialSpinner.prototype.start;
/**
   * Initialize element.
   */
MaterialSpinner.prototype.init = function () {
    if (this.element_) {
        for (var i = 1; i <= this.Constant_.MDL_SPINNER_LAYER_COUNT; i++) {
            this.createLayer(i);
        }
        this.element_.classList.add('is-upgraded');
    }
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialSpinner,
    classAsString: 'MaterialSpinner',
    cssClass: 'mdl-js-spinner',
    widget: true
});
/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
   * Class constructor for Checkbox MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {HTMLElement} element The element that will be upgraded.
   */
var MaterialSwitch = function MaterialSwitch(element) {
    this.element_ = element;
    // Initialize instance.
    this.init();
};
window['MaterialSwitch'] = MaterialSwitch;
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
MaterialSwitch.prototype.Constant_ = { TINY_TIMEOUT: 0.001 };
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialSwitch.prototype.CssClasses_ = {
    INPUT: 'mdl-switch__input',
    TRACK: 'mdl-switch__track',
    THUMB: 'mdl-switch__thumb',
    FOCUS_HELPER: 'mdl-switch__focus-helper',
    RIPPLE_EFFECT: 'mdl-js-ripple-effect',
    RIPPLE_IGNORE_EVENTS: 'mdl-js-ripple-effect--ignore-events',
    RIPPLE_CONTAINER: 'mdl-switch__ripple-container',
    RIPPLE_CENTER: 'mdl-ripple--center',
    RIPPLE: 'mdl-ripple',
    IS_FOCUSED: 'is-focused',
    IS_DISABLED: 'is-disabled',
    IS_CHECKED: 'is-checked'
};
/**
   * Handle change of state.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialSwitch.prototype.onChange_ = function (event) {
    this.updateClasses_();
};
/**
   * Handle focus of element.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialSwitch.prototype.onFocus_ = function (event) {
    this.element_.classList.add(this.CssClasses_.IS_FOCUSED);
};
/**
   * Handle lost focus of element.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialSwitch.prototype.onBlur_ = function (event) {
    this.element_.classList.remove(this.CssClasses_.IS_FOCUSED);
};
/**
   * Handle mouseup.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialSwitch.prototype.onMouseUp_ = function (event) {
    this.blur_();
};
/**
   * Handle class updates.
   *
   * @private
   */
MaterialSwitch.prototype.updateClasses_ = function () {
    this.checkDisabled();
    this.checkToggleState();
};
/**
   * Add blur.
   *
   * @private
   */
MaterialSwitch.prototype.blur_ = function () {
    // TODO: figure out why there's a focus event being fired after our blur,
    // so that we can avoid this hack.
    window.setTimeout(function () {
        this.inputElement_.blur();
    }.bind(this), this.Constant_.TINY_TIMEOUT);
};
// Public methods.
/**
   * Check the components disabled state.
   *
   * @public
   */
MaterialSwitch.prototype.checkDisabled = function () {
    if (this.inputElement_.disabled) {
        this.element_.classList.add(this.CssClasses_.IS_DISABLED);
    } else {
        this.element_.classList.remove(this.CssClasses_.IS_DISABLED);
    }
};
MaterialSwitch.prototype['checkDisabled'] = MaterialSwitch.prototype.checkDisabled;
/**
   * Check the components toggled state.
   *
   * @public
   */
MaterialSwitch.prototype.checkToggleState = function () {
    if (this.inputElement_.checked) {
        this.element_.classList.add(this.CssClasses_.IS_CHECKED);
    } else {
        this.element_.classList.remove(this.CssClasses_.IS_CHECKED);
    }
};
MaterialSwitch.prototype['checkToggleState'] = MaterialSwitch.prototype.checkToggleState;
/**
   * Disable switch.
   *
   * @public
   */
MaterialSwitch.prototype.disable = function () {
    this.inputElement_.disabled = true;
    this.updateClasses_();
};
MaterialSwitch.prototype['disable'] = MaterialSwitch.prototype.disable;
/**
   * Enable switch.
   *
   * @public
   */
MaterialSwitch.prototype.enable = function () {
    this.inputElement_.disabled = false;
    this.updateClasses_();
};
MaterialSwitch.prototype['enable'] = MaterialSwitch.prototype.enable;
/**
   * Activate switch.
   *
   * @public
   */
MaterialSwitch.prototype.on = function () {
    this.inputElement_.checked = true;
    this.updateClasses_();
};
MaterialSwitch.prototype['on'] = MaterialSwitch.prototype.on;
/**
   * Deactivate switch.
   *
   * @public
   */
MaterialSwitch.prototype.off = function () {
    this.inputElement_.checked = false;
    this.updateClasses_();
};
MaterialSwitch.prototype['off'] = MaterialSwitch.prototype.off;
/**
   * Initialize element.
   */
MaterialSwitch.prototype.init = function () {
    if (this.element_) {
        this.inputElement_ = this.element_.querySelector('.' + this.CssClasses_.INPUT);
        var track = document.createElement('div');
        track.classList.add(this.CssClasses_.TRACK);
        var thumb = document.createElement('div');
        thumb.classList.add(this.CssClasses_.THUMB);
        var focusHelper = document.createElement('span');
        focusHelper.classList.add(this.CssClasses_.FOCUS_HELPER);
        thumb.appendChild(focusHelper);
        this.element_.appendChild(track);
        this.element_.appendChild(thumb);
        this.boundMouseUpHandler = this.onMouseUp_.bind(this);
        if (this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT)) {
            this.element_.classList.add(this.CssClasses_.RIPPLE_IGNORE_EVENTS);
            this.rippleContainerElement_ = document.createElement('span');
            this.rippleContainerElement_.classList.add(this.CssClasses_.RIPPLE_CONTAINER);
            this.rippleContainerElement_.classList.add(this.CssClasses_.RIPPLE_EFFECT);
            this.rippleContainerElement_.classList.add(this.CssClasses_.RIPPLE_CENTER);
            this.rippleContainerElement_.addEventListener('mouseup', this.boundMouseUpHandler);
            var ripple = document.createElement('span');
            ripple.classList.add(this.CssClasses_.RIPPLE);
            this.rippleContainerElement_.appendChild(ripple);
            this.element_.appendChild(this.rippleContainerElement_);
        }
        this.boundChangeHandler = this.onChange_.bind(this);
        this.boundFocusHandler = this.onFocus_.bind(this);
        this.boundBlurHandler = this.onBlur_.bind(this);
        this.inputElement_.addEventListener('change', this.boundChangeHandler);
        this.inputElement_.addEventListener('focus', this.boundFocusHandler);
        this.inputElement_.addEventListener('blur', this.boundBlurHandler);
        this.element_.addEventListener('mouseup', this.boundMouseUpHandler);
        this.updateClasses_();
        this.element_.classList.add('is-upgraded');
    }
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialSwitch,
    classAsString: 'MaterialSwitch',
    cssClass: 'mdl-js-switch',
    widget: true
});
/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
   * Class constructor for Tabs MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {Element} element The element that will be upgraded.
   */
var MaterialTabs = function MaterialTabs(element) {
    // Stores the HTML element.
    this.element_ = element;
    // Initialize instance.
    this.init();
};
window['MaterialTabs'] = MaterialTabs;
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string}
   * @private
   */
MaterialTabs.prototype.Constant_ = {};
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialTabs.prototype.CssClasses_ = {
    TAB_CLASS: 'mdl-tabs__tab',
    PANEL_CLASS: 'mdl-tabs__panel',
    ACTIVE_CLASS: 'is-active',
    UPGRADED_CLASS: 'is-upgraded',
    MDL_JS_RIPPLE_EFFECT: 'mdl-js-ripple-effect',
    MDL_RIPPLE_CONTAINER: 'mdl-tabs__ripple-container',
    MDL_RIPPLE: 'mdl-ripple',
    MDL_JS_RIPPLE_EFFECT_IGNORE_EVENTS: 'mdl-js-ripple-effect--ignore-events'
};
/**
   * Handle clicks to a tabs component
   *
   * @private
   */
MaterialTabs.prototype.initTabs_ = function () {
    if (this.element_.classList.contains(this.CssClasses_.MDL_JS_RIPPLE_EFFECT)) {
        this.element_.classList.add(this.CssClasses_.MDL_JS_RIPPLE_EFFECT_IGNORE_EVENTS);
    }
    // Select element tabs, document panels
    this.tabs_ = this.element_.querySelectorAll('.' + this.CssClasses_.TAB_CLASS);
    this.panels_ = this.element_.querySelectorAll('.' + this.CssClasses_.PANEL_CLASS);
    // Create new tabs for each tab element
    for (var i = 0; i < this.tabs_.length; i++) {
        new MaterialTab(this.tabs_[i], this);
    }
    this.element_.classList.add(this.CssClasses_.UPGRADED_CLASS);
};
/**
   * Reset tab state, dropping active classes
   *
   * @private
   */
MaterialTabs.prototype.resetTabState_ = function () {
    for (var k = 0; k < this.tabs_.length; k++) {
        this.tabs_[k].classList.remove(this.CssClasses_.ACTIVE_CLASS);
    }
};
/**
   * Reset panel state, droping active classes
   *
   * @private
   */
MaterialTabs.prototype.resetPanelState_ = function () {
    for (var j = 0; j < this.panels_.length; j++) {
        this.panels_[j].classList.remove(this.CssClasses_.ACTIVE_CLASS);
    }
};
/**
   * Initialize element.
   */
MaterialTabs.prototype.init = function () {
    if (this.element_) {
        this.initTabs_();
    }
};
/**
   * Constructor for an individual tab.
   *
   * @constructor
   * @param {Element} tab The HTML element for the tab.
   * @param {MaterialTabs} ctx The MaterialTabs object that owns the tab.
   */
function MaterialTab(tab, ctx) {
    if (tab) {
        if (ctx.element_.classList.contains(ctx.CssClasses_.MDL_JS_RIPPLE_EFFECT)) {
            var rippleContainer = document.createElement('span');
            rippleContainer.classList.add(ctx.CssClasses_.MDL_RIPPLE_CONTAINER);
            rippleContainer.classList.add(ctx.CssClasses_.MDL_JS_RIPPLE_EFFECT);
            var ripple = document.createElement('span');
            ripple.classList.add(ctx.CssClasses_.MDL_RIPPLE);
            rippleContainer.appendChild(ripple);
            tab.appendChild(rippleContainer);
        }
        tab.addEventListener('click', function (e) {
            e.preventDefault();
            var href = tab.href.split('#')[1];
            var panel = ctx.element_.querySelector('#' + href);
            ctx.resetTabState_();
            ctx.resetPanelState_();
            tab.classList.add(ctx.CssClasses_.ACTIVE_CLASS);
            panel.classList.add(ctx.CssClasses_.ACTIVE_CLASS);
        });
    }
}
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialTabs,
    classAsString: 'MaterialTabs',
    cssClass: 'mdl-js-tabs'
});
/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
   * Class constructor for Textfield MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {HTMLElement} element The element that will be upgraded.
   */
var MaterialTextfield = function MaterialTextfield(element) {
    this.element_ = element;
    this.maxRows = this.Constant_.NO_MAX_ROWS;
    // Initialize instance.
    this.init();
};
window['MaterialTextfield'] = MaterialTextfield;
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
MaterialTextfield.prototype.Constant_ = {
    NO_MAX_ROWS: -1,
    MAX_ROWS_ATTRIBUTE: 'maxrows'
};
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialTextfield.prototype.CssClasses_ = {
    LABEL: 'mdl-textfield__label',
    INPUT: 'mdl-textfield__input',
    IS_DIRTY: 'is-dirty',
    IS_FOCUSED: 'is-focused',
    IS_DISABLED: 'is-disabled',
    IS_INVALID: 'is-invalid',
    IS_UPGRADED: 'is-upgraded',
    HAS_PLACEHOLDER: 'has-placeholder'
};
/**
   * Handle input being entered.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialTextfield.prototype.onKeyDown_ = function (event) {
    var currentRowCount = event.target.value.split('\n').length;
    if (event.keyCode === 13) {
        if (currentRowCount >= this.maxRows) {
            event.preventDefault();
        }
    }
};
/**
   * Handle focus.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialTextfield.prototype.onFocus_ = function (event) {
    this.element_.classList.add(this.CssClasses_.IS_FOCUSED);
};
/**
   * Handle lost focus.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialTextfield.prototype.onBlur_ = function (event) {
    this.element_.classList.remove(this.CssClasses_.IS_FOCUSED);
};
/**
   * Handle reset event from out side.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialTextfield.prototype.onReset_ = function (event) {
    this.updateClasses_();
};
/**
   * Handle class updates.
   *
   * @private
   */
MaterialTextfield.prototype.updateClasses_ = function () {
    this.checkDisabled();
    this.checkValidity();
    this.checkDirty();
    this.checkFocus();
};
// Public methods.
/**
   * Check the disabled state and update field accordingly.
   *
   * @public
   */
MaterialTextfield.prototype.checkDisabled = function () {
    if (this.input_.disabled) {
        this.element_.classList.add(this.CssClasses_.IS_DISABLED);
    } else {
        this.element_.classList.remove(this.CssClasses_.IS_DISABLED);
    }
};
MaterialTextfield.prototype['checkDisabled'] = MaterialTextfield.prototype.checkDisabled;
/**
  * Check the focus state and update field accordingly.
  *
  * @public
  */
MaterialTextfield.prototype.checkFocus = function () {
    if (Boolean(this.element_.querySelector(':focus'))) {
        this.element_.classList.add(this.CssClasses_.IS_FOCUSED);
    } else {
        this.element_.classList.remove(this.CssClasses_.IS_FOCUSED);
    }
};
MaterialTextfield.prototype['checkFocus'] = MaterialTextfield.prototype.checkFocus;
/**
   * Check the validity state and update field accordingly.
   *
   * @public
   */
MaterialTextfield.prototype.checkValidity = function () {
    if (this.input_.validity) {
        if (this.input_.validity.valid) {
            this.element_.classList.remove(this.CssClasses_.IS_INVALID);
        } else {
            this.element_.classList.add(this.CssClasses_.IS_INVALID);
        }
    }
};
MaterialTextfield.prototype['checkValidity'] = MaterialTextfield.prototype.checkValidity;
/**
   * Check the dirty state and update field accordingly.
   *
   * @public
   */
MaterialTextfield.prototype.checkDirty = function () {
    if (this.input_.value && this.input_.value.length > 0) {
        this.element_.classList.add(this.CssClasses_.IS_DIRTY);
    } else {
        this.element_.classList.remove(this.CssClasses_.IS_DIRTY);
    }
};
MaterialTextfield.prototype['checkDirty'] = MaterialTextfield.prototype.checkDirty;
/**
   * Disable text field.
   *
   * @public
   */
MaterialTextfield.prototype.disable = function () {
    this.input_.disabled = true;
    this.updateClasses_();
};
MaterialTextfield.prototype['disable'] = MaterialTextfield.prototype.disable;
/**
   * Enable text field.
   *
   * @public
   */
MaterialTextfield.prototype.enable = function () {
    this.input_.disabled = false;
    this.updateClasses_();
};
MaterialTextfield.prototype['enable'] = MaterialTextfield.prototype.enable;
/**
   * Update text field value.
   *
   * @param {string} value The value to which to set the control (optional).
   * @public
   */
MaterialTextfield.prototype.change = function (value) {
    this.input_.value = value || '';
    this.updateClasses_();
};
MaterialTextfield.prototype['change'] = MaterialTextfield.prototype.change;
/**
   * Initialize element.
   */
MaterialTextfield.prototype.init = function () {
    if (this.element_) {
        this.label_ = this.element_.querySelector('.' + this.CssClasses_.LABEL);
        this.input_ = this.element_.querySelector('.' + this.CssClasses_.INPUT);
        if (this.input_) {
            if (this.input_.hasAttribute(this.Constant_.MAX_ROWS_ATTRIBUTE)) {
                this.maxRows = parseInt(this.input_.getAttribute(this.Constant_.MAX_ROWS_ATTRIBUTE), 10);
                if (isNaN(this.maxRows)) {
                    this.maxRows = this.Constant_.NO_MAX_ROWS;
                }
            }
            if (this.input_.hasAttribute('placeholder')) {
                this.element_.classList.add(this.CssClasses_.HAS_PLACEHOLDER);
            }
            this.boundUpdateClassesHandler = this.updateClasses_.bind(this);
            this.boundFocusHandler = this.onFocus_.bind(this);
            this.boundBlurHandler = this.onBlur_.bind(this);
            this.boundResetHandler = this.onReset_.bind(this);
            this.input_.addEventListener('input', this.boundUpdateClassesHandler);
            this.input_.addEventListener('focus', this.boundFocusHandler);
            this.input_.addEventListener('blur', this.boundBlurHandler);
            this.input_.addEventListener('reset', this.boundResetHandler);
            if (this.maxRows !== this.Constant_.NO_MAX_ROWS) {
                // TODO: This should handle pasting multi line text.
                // Currently doesn't.
                this.boundKeyDownHandler = this.onKeyDown_.bind(this);
                this.input_.addEventListener('keydown', this.boundKeyDownHandler);
            }
            var invalid = this.element_.classList.contains(this.CssClasses_.IS_INVALID);
            this.updateClasses_();
            this.element_.classList.add(this.CssClasses_.IS_UPGRADED);
            if (invalid) {
                this.element_.classList.add(this.CssClasses_.IS_INVALID);
            }
            if (this.input_.hasAttribute('autofocus')) {
                this.element_.focus();
                this.checkFocus();
            }
        }
    }
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialTextfield,
    classAsString: 'MaterialTextfield',
    cssClass: 'mdl-js-textfield',
    widget: true
});
/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
   * Class constructor for Tooltip MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {HTMLElement} element The element that will be upgraded.
   */
var MaterialTooltip = function MaterialTooltip(element) {
    this.element_ = element;
    // Initialize instance.
    this.init();
};
window['MaterialTooltip'] = MaterialTooltip;
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
MaterialTooltip.prototype.Constant_ = {};
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialTooltip.prototype.CssClasses_ = {
    IS_ACTIVE: 'is-active',
    BOTTOM: 'mdl-tooltip--bottom',
    LEFT: 'mdl-tooltip--left',
    RIGHT: 'mdl-tooltip--right',
    TOP: 'mdl-tooltip--top'
};
/**
   * Handle mouseenter for tooltip.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialTooltip.prototype.handleMouseEnter_ = function (event) {
    var props = event.target.getBoundingClientRect();
    var left = props.left + props.width / 2;
    var top = props.top + props.height / 2;
    var marginLeft = -1 * (this.element_.offsetWidth / 2);
    var marginTop = -1 * (this.element_.offsetHeight / 2);
    if (this.element_.classList.contains(this.CssClasses_.LEFT) || this.element_.classList.contains(this.CssClasses_.RIGHT)) {
        left = props.width / 2;
        if (top + marginTop < 0) {
            this.element_.style.top = 0;
            this.element_.style.marginTop = 0;
        } else {
            this.element_.style.top = top + 'px';
            this.element_.style.marginTop = marginTop + 'px';
        }
    } else {
        if (left + marginLeft < 0) {
            this.element_.style.left = 0;
            this.element_.style.marginLeft = 0;
        } else {
            this.element_.style.left = left + 'px';
            this.element_.style.marginLeft = marginLeft + 'px';
        }
    }
    if (this.element_.classList.contains(this.CssClasses_.TOP)) {
        this.element_.style.top = props.top - this.element_.offsetHeight - 10 + 'px';
    } else if (this.element_.classList.contains(this.CssClasses_.RIGHT)) {
        this.element_.style.left = props.left + props.width + 10 + 'px';
    } else if (this.element_.classList.contains(this.CssClasses_.LEFT)) {
        this.element_.style.left = props.left - this.element_.offsetWidth - 10 + 'px';
    } else {
        this.element_.style.top = props.top + props.height + 10 + 'px';
    }
    this.element_.classList.add(this.CssClasses_.IS_ACTIVE);
};
/**
   * Handle mouseleave for tooltip.
   *
   * @private
   */
MaterialTooltip.prototype.handleMouseLeave_ = function () {
    this.element_.classList.remove(this.CssClasses_.IS_ACTIVE);
};
/**
   * Initialize element.
   */
MaterialTooltip.prototype.init = function () {
    if (this.element_) {
        var forElId = this.element_.getAttribute('for');
        if (forElId) {
            this.forElement_ = document.getElementById(forElId);
        }
        if (this.forElement_) {
            // It's left here because it prevents accidental text selection on Android
            if (!this.forElement_.hasAttribute('tabindex')) {
                this.forElement_.setAttribute('tabindex', '0');
            }
            this.boundMouseEnterHandler = this.handleMouseEnter_.bind(this);
            this.boundMouseLeaveHandler = this.handleMouseLeave_.bind(this);
            this.forElement_.addEventListener('mouseenter', this.boundMouseEnterHandler, false);
            this.forElement_.addEventListener('touchend', this.boundMouseEnterHandler, false);
            this.forElement_.addEventListener('mouseleave', this.boundMouseLeaveHandler, false);
            window.addEventListener('touchstart', this.boundMouseLeaveHandler);
        }
    }
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialTooltip,
    classAsString: 'MaterialTooltip',
    cssClass: 'mdl-tooltip'
});
/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
   * Class constructor for Layout MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {HTMLElement} element The element that will be upgraded.
   */
var MaterialLayout = function MaterialLayout(element) {
    this.element_ = element;
    // Initialize instance.
    this.init();
};
window['MaterialLayout'] = MaterialLayout;
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
MaterialLayout.prototype.Constant_ = {
    MAX_WIDTH: '(max-width: 1024px)',
    TAB_SCROLL_PIXELS: 100,
    RESIZE_TIMEOUT: 100,
    MENU_ICON: 'menu',
    CHEVRON_LEFT: 'chevron_left',
    CHEVRON_RIGHT: 'chevron_right'
};
/**
   * Keycodes, for code readability.
   *
   * @enum {number}
   * @private
   */
MaterialLayout.prototype.Keycodes_ = {
    ENTER: 13,
    ESCAPE: 27,
    SPACE: 32
};
/**
   * Modes.
   *
   * @enum {number}
   * @private
   */
MaterialLayout.prototype.Mode_ = {
    STANDARD: 0,
    SEAMED: 1,
    WATERFALL: 2,
    SCROLL: 3
};
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialLayout.prototype.CssClasses_ = {
    CONTAINER: 'mdl-layout__container',
    HEADER: 'mdl-layout__header',
    DRAWER: 'mdl-layout__drawer',
    CONTENT: 'mdl-layout__content',
    DRAWER_BTN: 'mdl-layout__drawer-button',
    ICON: 'material-icons',
    JS_RIPPLE_EFFECT: 'mdl-js-ripple-effect',
    RIPPLE_CONTAINER: 'mdl-layout__tab-ripple-container',
    RIPPLE: 'mdl-ripple',
    RIPPLE_IGNORE_EVENTS: 'mdl-js-ripple-effect--ignore-events',
    HEADER_SEAMED: 'mdl-layout__header--seamed',
    HEADER_WATERFALL: 'mdl-layout__header--waterfall',
    HEADER_SCROLL: 'mdl-layout__header--scroll',
    FIXED_HEADER: 'mdl-layout--fixed-header',
    OBFUSCATOR: 'mdl-layout__obfuscator',
    TAB_BAR: 'mdl-layout__tab-bar',
    TAB_CONTAINER: 'mdl-layout__tab-bar-container',
    TAB: 'mdl-layout__tab',
    TAB_BAR_BUTTON: 'mdl-layout__tab-bar-button',
    TAB_BAR_LEFT_BUTTON: 'mdl-layout__tab-bar-left-button',
    TAB_BAR_RIGHT_BUTTON: 'mdl-layout__tab-bar-right-button',
    PANEL: 'mdl-layout__tab-panel',
    HAS_DRAWER: 'has-drawer',
    HAS_TABS: 'has-tabs',
    HAS_SCROLLING_HEADER: 'has-scrolling-header',
    CASTING_SHADOW: 'is-casting-shadow',
    IS_COMPACT: 'is-compact',
    IS_SMALL_SCREEN: 'is-small-screen',
    IS_DRAWER_OPEN: 'is-visible',
    IS_ACTIVE: 'is-active',
    IS_UPGRADED: 'is-upgraded',
    IS_ANIMATING: 'is-animating',
    ON_LARGE_SCREEN: 'mdl-layout--large-screen-only',
    ON_SMALL_SCREEN: 'mdl-layout--small-screen-only'
};
/**
   * Handles scrolling on the content.
   *
   * @private
   */
MaterialLayout.prototype.contentScrollHandler_ = function () {
    if (this.header_.classList.contains(this.CssClasses_.IS_ANIMATING)) {
        return;
    }
    var headerVisible = !this.element_.classList.contains(this.CssClasses_.IS_SMALL_SCREEN) || this.element_.classList.contains(this.CssClasses_.FIXED_HEADER);
    if (this.content_.scrollTop > 0 && !this.header_.classList.contains(this.CssClasses_.IS_COMPACT)) {
        this.header_.classList.add(this.CssClasses_.CASTING_SHADOW);
        this.header_.classList.add(this.CssClasses_.IS_COMPACT);
        if (headerVisible) {
            this.header_.classList.add(this.CssClasses_.IS_ANIMATING);
        }
    } else if (this.content_.scrollTop <= 0 && this.header_.classList.contains(this.CssClasses_.IS_COMPACT)) {
        this.header_.classList.remove(this.CssClasses_.CASTING_SHADOW);
        this.header_.classList.remove(this.CssClasses_.IS_COMPACT);
        if (headerVisible) {
            this.header_.classList.add(this.CssClasses_.IS_ANIMATING);
        }
    }
};
/**
   * Handles a keyboard event on the drawer.
   *
   * @param {Event} evt The event that fired.
   * @private
   */
MaterialLayout.prototype.keyboardEventHandler_ = function (evt) {
    // Only react when the drawer is open.
    if (evt.keyCode === this.Keycodes_.ESCAPE && this.drawer_.classList.contains(this.CssClasses_.IS_DRAWER_OPEN)) {
        this.toggleDrawer();
    }
};
/**
   * Handles changes in screen size.
   *
   * @private
   */
MaterialLayout.prototype.screenSizeHandler_ = function () {
    if (this.screenSizeMediaQuery_.matches) {
        this.element_.classList.add(this.CssClasses_.IS_SMALL_SCREEN);
    } else {
        this.element_.classList.remove(this.CssClasses_.IS_SMALL_SCREEN);
        // Collapse drawer (if any) when moving to a large screen size.
        if (this.drawer_) {
            this.drawer_.classList.remove(this.CssClasses_.IS_DRAWER_OPEN);
            this.obfuscator_.classList.remove(this.CssClasses_.IS_DRAWER_OPEN);
        }
    }
};
/**
   * Handles events of drawer button.
   *
   * @param {Event} evt The event that fired.
   * @private
   */
MaterialLayout.prototype.drawerToggleHandler_ = function (evt) {
    if (evt && evt.type === 'keydown') {
        if (evt.keyCode === this.Keycodes_.SPACE || evt.keyCode === this.Keycodes_.ENTER) {
            // prevent scrolling in drawer nav
            evt.preventDefault();
        } else {
            // prevent other keys
            return;
        }
    }
    this.toggleDrawer();
};
/**
   * Handles (un)setting the `is-animating` class
   *
   * @private
   */
MaterialLayout.prototype.headerTransitionEndHandler_ = function () {
    this.header_.classList.remove(this.CssClasses_.IS_ANIMATING);
};
/**
   * Handles expanding the header on click
   *
   * @private
   */
MaterialLayout.prototype.headerClickHandler_ = function () {
    if (this.header_.classList.contains(this.CssClasses_.IS_COMPACT)) {
        this.header_.classList.remove(this.CssClasses_.IS_COMPACT);
        this.header_.classList.add(this.CssClasses_.IS_ANIMATING);
    }
};
/**
   * Reset tab state, dropping active classes
   *
   * @private
   */
MaterialLayout.prototype.resetTabState_ = function (tabBar) {
    for (var k = 0; k < tabBar.length; k++) {
        tabBar[k].classList.remove(this.CssClasses_.IS_ACTIVE);
    }
};
/**
   * Reset panel state, droping active classes
   *
   * @private
   */
MaterialLayout.prototype.resetPanelState_ = function (panels) {
    for (var j = 0; j < panels.length; j++) {
        panels[j].classList.remove(this.CssClasses_.IS_ACTIVE);
    }
};
/**
  * Toggle drawer state
  *
  * @public
  */
MaterialLayout.prototype.toggleDrawer = function () {
    var drawerButton = this.element_.querySelector('.' + this.CssClasses_.DRAWER_BTN);
    this.drawer_.classList.toggle(this.CssClasses_.IS_DRAWER_OPEN);
    this.obfuscator_.classList.toggle(this.CssClasses_.IS_DRAWER_OPEN);
    // Set accessibility properties.
    if (this.drawer_.classList.contains(this.CssClasses_.IS_DRAWER_OPEN)) {
        this.drawer_.setAttribute('aria-hidden', 'false');
        drawerButton.setAttribute('aria-expanded', 'true');
    } else {
        this.drawer_.setAttribute('aria-hidden', 'true');
        drawerButton.setAttribute('aria-expanded', 'false');
    }
};
MaterialLayout.prototype['toggleDrawer'] = MaterialLayout.prototype.toggleDrawer;
/**
   * Initialize element.
   */
MaterialLayout.prototype.init = function () {
    if (this.element_) {
        var container = document.createElement('div');
        container.classList.add(this.CssClasses_.CONTAINER);
        var focusedElement = this.element_.querySelector(':focus');
        this.element_.parentElement.insertBefore(container, this.element_);
        this.element_.parentElement.removeChild(this.element_);
        container.appendChild(this.element_);
        if (focusedElement) {
            focusedElement.focus();
        }
        var directChildren = this.element_.childNodes;
        var numChildren = directChildren.length;
        for (var c = 0; c < numChildren; c++) {
            var child = directChildren[c];
            if (child.classList && child.classList.contains(this.CssClasses_.HEADER)) {
                this.header_ = child;
            }
            if (child.classList && child.classList.contains(this.CssClasses_.DRAWER)) {
                this.drawer_ = child;
            }
            if (child.classList && child.classList.contains(this.CssClasses_.CONTENT)) {
                this.content_ = child;
            }
        }
        window.addEventListener('pageshow', function (e) {
            if (e.persisted) {
                // when page is loaded from back/forward cache
                // trigger repaint to let layout scroll in safari
                this.element_.style.overflowY = 'hidden';
                requestAnimationFrame(function () {
                    this.element_.style.overflowY = '';
                }.bind(this));
            }
        }.bind(this), false);
        if (this.header_) {
            this.tabBar_ = this.header_.querySelector('.' + this.CssClasses_.TAB_BAR);
        }
        var mode = this.Mode_.STANDARD;
        if (this.header_) {
            if (this.header_.classList.contains(this.CssClasses_.HEADER_SEAMED)) {
                mode = this.Mode_.SEAMED;
            } else if (this.header_.classList.contains(this.CssClasses_.HEADER_WATERFALL)) {
                mode = this.Mode_.WATERFALL;
                this.header_.addEventListener('transitionend', this.headerTransitionEndHandler_.bind(this));
                this.header_.addEventListener('click', this.headerClickHandler_.bind(this));
            } else if (this.header_.classList.contains(this.CssClasses_.HEADER_SCROLL)) {
                mode = this.Mode_.SCROLL;
                container.classList.add(this.CssClasses_.HAS_SCROLLING_HEADER);
            }
            if (mode === this.Mode_.STANDARD) {
                this.header_.classList.add(this.CssClasses_.CASTING_SHADOW);
                if (this.tabBar_) {
                    this.tabBar_.classList.add(this.CssClasses_.CASTING_SHADOW);
                }
            } else if (mode === this.Mode_.SEAMED || mode === this.Mode_.SCROLL) {
                this.header_.classList.remove(this.CssClasses_.CASTING_SHADOW);
                if (this.tabBar_) {
                    this.tabBar_.classList.remove(this.CssClasses_.CASTING_SHADOW);
                }
            } else if (mode === this.Mode_.WATERFALL) {
                // Add and remove shadows depending on scroll position.
                // Also add/remove auxiliary class for styling of the compact version of
                // the header.
                this.content_.addEventListener('scroll', this.contentScrollHandler_.bind(this));
                this.contentScrollHandler_();
            }
        }
        // Add drawer toggling button to our layout, if we have an openable drawer.
        if (this.drawer_) {
            var drawerButton = this.element_.querySelector('.' + this.CssClasses_.DRAWER_BTN);
            if (!drawerButton) {
                drawerButton = document.createElement('div');
                drawerButton.setAttribute('aria-expanded', 'false');
                drawerButton.setAttribute('role', 'button');
                drawerButton.setAttribute('tabindex', '0');
                drawerButton.classList.add(this.CssClasses_.DRAWER_BTN);
                var drawerButtonIcon = document.createElement('i');
                drawerButtonIcon.classList.add(this.CssClasses_.ICON);
                drawerButtonIcon.innerHTML = this.Constant_.MENU_ICON;
                drawerButton.appendChild(drawerButtonIcon);
            }
            if (this.drawer_.classList.contains(this.CssClasses_.ON_LARGE_SCREEN)) {
                //If drawer has ON_LARGE_SCREEN class then add it to the drawer toggle button as well.
                drawerButton.classList.add(this.CssClasses_.ON_LARGE_SCREEN);
            } else if (this.drawer_.classList.contains(this.CssClasses_.ON_SMALL_SCREEN)) {
                //If drawer has ON_SMALL_SCREEN class then add it to the drawer toggle button as well.
                drawerButton.classList.add(this.CssClasses_.ON_SMALL_SCREEN);
            }
            drawerButton.addEventListener('click', this.drawerToggleHandler_.bind(this));
            drawerButton.addEventListener('keydown', this.drawerToggleHandler_.bind(this));
            // Add a class if the layout has a drawer, for altering the left padding.
            // Adds the HAS_DRAWER to the elements since this.header_ may or may
            // not be present.
            this.element_.classList.add(this.CssClasses_.HAS_DRAWER);
            // If we have a fixed header, add the button to the header rather than
            // the layout.
            if (this.element_.classList.contains(this.CssClasses_.FIXED_HEADER)) {
                this.header_.insertBefore(drawerButton, this.header_.firstChild);
            } else {
                this.element_.insertBefore(drawerButton, this.content_);
            }
            var obfuscator = document.createElement('div');
            obfuscator.classList.add(this.CssClasses_.OBFUSCATOR);
            this.element_.appendChild(obfuscator);
            obfuscator.addEventListener('click', this.drawerToggleHandler_.bind(this));
            this.obfuscator_ = obfuscator;
            this.drawer_.addEventListener('keydown', this.keyboardEventHandler_.bind(this));
            this.drawer_.setAttribute('aria-hidden', 'true');
        }
        // Keep an eye on screen size, and add/remove auxiliary class for styling
        // of small screens.
        this.screenSizeMediaQuery_ = window.matchMedia(this.Constant_.MAX_WIDTH);
        this.screenSizeMediaQuery_.addListener(this.screenSizeHandler_.bind(this));
        this.screenSizeHandler_();
        // Initialize tabs, if any.
        if (this.header_ && this.tabBar_) {
            this.element_.classList.add(this.CssClasses_.HAS_TABS);
            var tabContainer = document.createElement('div');
            tabContainer.classList.add(this.CssClasses_.TAB_CONTAINER);
            this.header_.insertBefore(tabContainer, this.tabBar_);
            this.header_.removeChild(this.tabBar_);
            var leftButton = document.createElement('div');
            leftButton.classList.add(this.CssClasses_.TAB_BAR_BUTTON);
            leftButton.classList.add(this.CssClasses_.TAB_BAR_LEFT_BUTTON);
            var leftButtonIcon = document.createElement('i');
            leftButtonIcon.classList.add(this.CssClasses_.ICON);
            leftButtonIcon.textContent = this.Constant_.CHEVRON_LEFT;
            leftButton.appendChild(leftButtonIcon);
            leftButton.addEventListener('click', function () {
                this.tabBar_.scrollLeft -= this.Constant_.TAB_SCROLL_PIXELS;
            }.bind(this));
            var rightButton = document.createElement('div');
            rightButton.classList.add(this.CssClasses_.TAB_BAR_BUTTON);
            rightButton.classList.add(this.CssClasses_.TAB_BAR_RIGHT_BUTTON);
            var rightButtonIcon = document.createElement('i');
            rightButtonIcon.classList.add(this.CssClasses_.ICON);
            rightButtonIcon.textContent = this.Constant_.CHEVRON_RIGHT;
            rightButton.appendChild(rightButtonIcon);
            rightButton.addEventListener('click', function () {
                this.tabBar_.scrollLeft += this.Constant_.TAB_SCROLL_PIXELS;
            }.bind(this));
            tabContainer.appendChild(leftButton);
            tabContainer.appendChild(this.tabBar_);
            tabContainer.appendChild(rightButton);
            // Add and remove tab buttons depending on scroll position and total
            // window size.
            var tabUpdateHandler = function () {
                if (this.tabBar_.scrollLeft > 0) {
                    leftButton.classList.add(this.CssClasses_.IS_ACTIVE);
                } else {
                    leftButton.classList.remove(this.CssClasses_.IS_ACTIVE);
                }
                if (this.tabBar_.scrollLeft < this.tabBar_.scrollWidth - this.tabBar_.offsetWidth) {
                    rightButton.classList.add(this.CssClasses_.IS_ACTIVE);
                } else {
                    rightButton.classList.remove(this.CssClasses_.IS_ACTIVE);
                }
            }.bind(this);
            this.tabBar_.addEventListener('scroll', tabUpdateHandler);
            tabUpdateHandler();
            // Update tabs when the window resizes.
            var windowResizeHandler = function () {
                // Use timeouts to make sure it doesn't happen too often.
                if (this.resizeTimeoutId_) {
                    clearTimeout(this.resizeTimeoutId_);
                }
                this.resizeTimeoutId_ = setTimeout(function () {
                    tabUpdateHandler();
                    this.resizeTimeoutId_ = null;
                }.bind(this), this.Constant_.RESIZE_TIMEOUT);
            }.bind(this);
            window.addEventListener('resize', windowResizeHandler);
            if (this.tabBar_.classList.contains(this.CssClasses_.JS_RIPPLE_EFFECT)) {
                this.tabBar_.classList.add(this.CssClasses_.RIPPLE_IGNORE_EVENTS);
            }
            // Select element tabs, document panels
            var tabs = this.tabBar_.querySelectorAll('.' + this.CssClasses_.TAB);
            var panels = this.content_.querySelectorAll('.' + this.CssClasses_.PANEL);
            // Create new tabs for each tab element
            for (var i = 0; i < tabs.length; i++) {
                new MaterialLayoutTab(tabs[i], tabs, panels, this);
            }
        }
        this.element_.classList.add(this.CssClasses_.IS_UPGRADED);
    }
};
/**
   * Constructor for an individual tab.
   *
   * @constructor
   * @param {HTMLElement} tab The HTML element for the tab.
   * @param {!Array<HTMLElement>} tabs Array with HTML elements for all tabs.
   * @param {!Array<HTMLElement>} panels Array with HTML elements for all panels.
   * @param {MaterialLayout} layout The MaterialLayout object that owns the tab.
   */
function MaterialLayoutTab(tab, tabs, panels, layout) {
    /**
     * Auxiliary method to programmatically select a tab in the UI.
     */
    function selectTab() {
        var href = tab.href.split('#')[1];
        var panel = layout.content_.querySelector('#' + href);
        layout.resetTabState_(tabs);
        layout.resetPanelState_(panels);
        tab.classList.add(layout.CssClasses_.IS_ACTIVE);
        panel.classList.add(layout.CssClasses_.IS_ACTIVE);
    }
    if (layout.tabBar_.classList.contains(layout.CssClasses_.JS_RIPPLE_EFFECT)) {
        var rippleContainer = document.createElement('span');
        rippleContainer.classList.add(layout.CssClasses_.RIPPLE_CONTAINER);
        rippleContainer.classList.add(layout.CssClasses_.JS_RIPPLE_EFFECT);
        var ripple = document.createElement('span');
        ripple.classList.add(layout.CssClasses_.RIPPLE);
        rippleContainer.appendChild(ripple);
        tab.appendChild(rippleContainer);
    }
    tab.addEventListener('click', function (e) {
        if (tab.getAttribute('href').charAt(0) === '#') {
            e.preventDefault();
            selectTab();
        }
    });
    tab.show = selectTab;
}
window['MaterialLayoutTab'] = MaterialLayoutTab;
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialLayout,
    classAsString: 'MaterialLayout',
    cssClass: 'mdl-js-layout'
});
/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
   * Class constructor for Data Table Card MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {Element} element The element that will be upgraded.
   */
var MaterialDataTable = function MaterialDataTable(element) {
    this.element_ = element;
    // Initialize instance.
    this.init();
};
window['MaterialDataTable'] = MaterialDataTable;
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
MaterialDataTable.prototype.Constant_ = {};
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialDataTable.prototype.CssClasses_ = {
    DATA_TABLE: 'mdl-data-table',
    SELECTABLE: 'mdl-data-table--selectable',
    SELECT_ELEMENT: 'mdl-data-table__select',
    IS_SELECTED: 'is-selected',
    IS_UPGRADED: 'is-upgraded'
};
/**
   * Generates and returns a function that toggles the selection state of a
   * single row (or multiple rows).
   *
   * @param {Element} checkbox Checkbox that toggles the selection state.
   * @param {Element} row Row to toggle when checkbox changes.
   * @param {(Array<Object>|NodeList)=} opt_rows Rows to toggle when checkbox changes.
   * @private
   */
MaterialDataTable.prototype.selectRow_ = function (checkbox, row, opt_rows) {
    if (row) {
        return function () {
            if (checkbox.checked) {
                row.classList.add(this.CssClasses_.IS_SELECTED);
            } else {
                row.classList.remove(this.CssClasses_.IS_SELECTED);
            }
        }.bind(this);
    }
    if (opt_rows) {
        return function () {
            var i;
            var el;
            if (checkbox.checked) {
                for (i = 0; i < opt_rows.length; i++) {
                    el = opt_rows[i].querySelector('td').querySelector('.mdl-checkbox');
                    el['MaterialCheckbox'].check();
                    opt_rows[i].classList.add(this.CssClasses_.IS_SELECTED);
                }
            } else {
                for (i = 0; i < opt_rows.length; i++) {
                    el = opt_rows[i].querySelector('td').querySelector('.mdl-checkbox');
                    el['MaterialCheckbox'].uncheck();
                    opt_rows[i].classList.remove(this.CssClasses_.IS_SELECTED);
                }
            }
        }.bind(this);
    }
};
/**
   * Creates a checkbox for a single or or multiple rows and hooks up the
   * event handling.
   *
   * @param {Element} row Row to toggle when checkbox changes.
   * @param {(Array<Object>|NodeList)=} opt_rows Rows to toggle when checkbox changes.
   * @private
   */
MaterialDataTable.prototype.createCheckbox_ = function (row, opt_rows) {
    var label = document.createElement('label');
    var labelClasses = [
        'mdl-checkbox',
        'mdl-js-checkbox',
        'mdl-js-ripple-effect',
        this.CssClasses_.SELECT_ELEMENT
    ];
    label.className = labelClasses.join(' ');
    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.classList.add('mdl-checkbox__input');
    if (row) {
        checkbox.checked = row.classList.contains(this.CssClasses_.IS_SELECTED);
        checkbox.addEventListener('change', this.selectRow_(checkbox, row));
    } else if (opt_rows) {
        checkbox.addEventListener('change', this.selectRow_(checkbox, null, opt_rows));
    }
    label.appendChild(checkbox);
    componentHandler.upgradeElement(label, 'MaterialCheckbox');
    return label;
};
/**
   * Initialize element.
   */
MaterialDataTable.prototype.init = function () {
    if (this.element_) {
        var firstHeader = this.element_.querySelector('th');
        var bodyRows = Array.prototype.slice.call(this.element_.querySelectorAll('tbody tr'));
        var footRows = Array.prototype.slice.call(this.element_.querySelectorAll('tfoot tr'));
        var rows = bodyRows.concat(footRows);
        if (this.element_.classList.contains(this.CssClasses_.SELECTABLE)) {
            var th = document.createElement('th');
            var headerCheckbox = this.createCheckbox_(null, rows);
            th.appendChild(headerCheckbox);
            firstHeader.parentElement.insertBefore(th, firstHeader);
            for (var i = 0; i < rows.length; i++) {
                var firstCell = rows[i].querySelector('td');
                if (firstCell) {
                    var td = document.createElement('td');
                    if (rows[i].parentNode.nodeName.toUpperCase() === 'TBODY') {
                        var rowCheckbox = this.createCheckbox_(rows[i]);
                        td.appendChild(rowCheckbox);
                    }
                    rows[i].insertBefore(td, firstCell);
                }
            }
            this.element_.classList.add(this.CssClasses_.IS_UPGRADED);
        }
    }
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialDataTable,
    classAsString: 'MaterialDataTable',
    cssClass: 'mdl-js-data-table'
});
/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
   * Class constructor for Ripple MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {HTMLElement} element The element that will be upgraded.
   */
var MaterialRipple = function MaterialRipple(element) {
    this.element_ = element;
    // Initialize instance.
    this.init();
};
window['MaterialRipple'] = MaterialRipple;
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
MaterialRipple.prototype.Constant_ = {
    INITIAL_SCALE: 'scale(0.0001, 0.0001)',
    INITIAL_SIZE: '1px',
    INITIAL_OPACITY: '0.4',
    FINAL_OPACITY: '0',
    FINAL_SCALE: ''
};
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialRipple.prototype.CssClasses_ = {
    RIPPLE_CENTER: 'mdl-ripple--center',
    RIPPLE_EFFECT_IGNORE_EVENTS: 'mdl-js-ripple-effect--ignore-events',
    RIPPLE: 'mdl-ripple',
    IS_ANIMATING: 'is-animating',
    IS_VISIBLE: 'is-visible'
};
/**
   * Handle mouse / finger down on element.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialRipple.prototype.downHandler_ = function (event) {
    if (!this.rippleElement_.style.width && !this.rippleElement_.style.height) {
        var rect = this.element_.getBoundingClientRect();
        this.boundHeight = rect.height;
        this.boundWidth = rect.width;
        this.rippleSize_ = Math.sqrt(rect.width * rect.width + rect.height * rect.height) * 2 + 2;
        this.rippleElement_.style.width = this.rippleSize_ + 'px';
        this.rippleElement_.style.height = this.rippleSize_ + 'px';
    }
    this.rippleElement_.classList.add(this.CssClasses_.IS_VISIBLE);
    if (event.type === 'mousedown' && this.ignoringMouseDown_) {
        this.ignoringMouseDown_ = false;
    } else {
        if (event.type === 'touchstart') {
            this.ignoringMouseDown_ = true;
        }
        var frameCount = this.getFrameCount();
        if (frameCount > 0) {
            return;
        }
        this.setFrameCount(1);
        var bound = event.currentTarget.getBoundingClientRect();
        var x;
        var y;
        // Check if we are handling a keyboard click.
        if (event.clientX === 0 && event.clientY === 0) {
            x = Math.round(bound.width / 2);
            y = Math.round(bound.height / 2);
        } else {
            var clientX = event.clientX ? event.clientX : event.touches[0].clientX;
            var clientY = event.clientY ? event.clientY : event.touches[0].clientY;
            x = Math.round(clientX - bound.left);
            y = Math.round(clientY - bound.top);
        }
        this.setRippleXY(x, y);
        this.setRippleStyles(true);
        window.requestAnimationFrame(this.animFrameHandler.bind(this));
    }
};
/**
   * Handle mouse / finger up on element.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialRipple.prototype.upHandler_ = function (event) {
    // Don't fire for the artificial "mouseup" generated by a double-click.
    if (event && event.detail !== 2) {
        // Allow a repaint to occur before removing this class, so the animation
        // shows for tap events, which seem to trigger a mouseup too soon after
        // mousedown.
        window.setTimeout(function () {
            this.rippleElement_.classList.remove(this.CssClasses_.IS_VISIBLE);
        }.bind(this), 0);
    }
};
/**
   * Initialize element.
   */
MaterialRipple.prototype.init = function () {
    if (this.element_) {
        var recentering = this.element_.classList.contains(this.CssClasses_.RIPPLE_CENTER);
        if (!this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT_IGNORE_EVENTS)) {
            this.rippleElement_ = this.element_.querySelector('.' + this.CssClasses_.RIPPLE);
            this.frameCount_ = 0;
            this.rippleSize_ = 0;
            this.x_ = 0;
            this.y_ = 0;
            // Touch start produces a compat mouse down event, which would cause a
            // second ripples. To avoid that, we use this property to ignore the first
            // mouse down after a touch start.
            this.ignoringMouseDown_ = false;
            this.boundDownHandler = this.downHandler_.bind(this);
            this.element_.addEventListener('mousedown', this.boundDownHandler);
            this.element_.addEventListener('touchstart', this.boundDownHandler);
            this.boundUpHandler = this.upHandler_.bind(this);
            this.element_.addEventListener('mouseup', this.boundUpHandler);
            this.element_.addEventListener('mouseleave', this.boundUpHandler);
            this.element_.addEventListener('touchend', this.boundUpHandler);
            this.element_.addEventListener('blur', this.boundUpHandler);
            /**
         * Getter for frameCount_.
         * @return {number} the frame count.
         */
            this.getFrameCount = function () {
                return this.frameCount_;
            };
            /**
         * Setter for frameCount_.
         * @param {number} fC the frame count.
         */
            this.setFrameCount = function (fC) {
                this.frameCount_ = fC;
            };
            /**
         * Getter for rippleElement_.
         * @return {Element} the ripple element.
         */
            this.getRippleElement = function () {
                return this.rippleElement_;
            };
            /**
         * Sets the ripple X and Y coordinates.
         * @param  {number} newX the new X coordinate
         * @param  {number} newY the new Y coordinate
         */
            this.setRippleXY = function (newX, newY) {
                this.x_ = newX;
                this.y_ = newY;
            };
            /**
         * Sets the ripple styles.
         * @param  {boolean} start whether or not this is the start frame.
         */
            this.setRippleStyles = function (start) {
                if (this.rippleElement_ !== null) {
                    var transformString;
                    var scale;
                    var size;
                    var offset = 'translate(' + this.x_ + 'px, ' + this.y_ + 'px)';
                    if (start) {
                        scale = this.Constant_.INITIAL_SCALE;
                        size = this.Constant_.INITIAL_SIZE;
                    } else {
                        scale = this.Constant_.FINAL_SCALE;
                        size = this.rippleSize_ + 'px';
                        if (recentering) {
                            offset = 'translate(' + this.boundWidth / 2 + 'px, ' + this.boundHeight / 2 + 'px)';
                        }
                    }
                    transformString = 'translate(-50%, -50%) ' + offset + scale;
                    this.rippleElement_.style.webkitTransform = transformString;
                    this.rippleElement_.style.msTransform = transformString;
                    this.rippleElement_.style.transform = transformString;
                    if (start) {
                        this.rippleElement_.classList.remove(this.CssClasses_.IS_ANIMATING);
                    } else {
                        this.rippleElement_.classList.add(this.CssClasses_.IS_ANIMATING);
                    }
                }
            };
            /**
         * Handles an animation frame.
         */
            this.animFrameHandler = function () {
                if (this.frameCount_-- > 0) {
                    window.requestAnimationFrame(this.animFrameHandler.bind(this));
                } else {
                    this.setRippleStyles(false);
                }
            };
        }
    }
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialRipple,
    classAsString: 'MaterialRipple',
    cssClass: 'mdl-js-ripple-effect',
    widget: false
});
}());

'use strict';

// TODO: This is messy clean it up
window.addEventListener('load', function () {
  'use strict';

  var container = document.querySelector('.mdl-layout__container');
  var drawer = document.querySelector('.mdl-layout__drawer');
  var drawerButton = document.querySelector('.mdl-layout__drawer-button');
  var obfuscator = document.querySelector('.mdl-layout__obfuscator');

  // Since MDL isn't handling the 'escape' key properly, I had to do this
  // Hides drawer and obfuscator on escape keydown
  window.addEventListener('keydown', function (evt) {
    if (evt.keyCode === 27 && drawer.classList.contains('is-visible')) {
      closeDrawer();
      headerAccessibilityToggle();
    }
  });

  function closeDrawer() {
    drawer.className = 'mdl-layout__drawer';
    obfuscator.className = 'mdl-layout__obfuscator';
  }

  /*******************/
  /* Event Listeners */
  /*******************/
  drawerButton.addEventListener('click', function () {
    headerAccessibilityToggle();
  });

  drawerButton.addEventListener('keydown', function (evt) {
    // 27 is escape key
    // Call accessibility function if 'space' or 'enter' is pressed
    if (evt.keyCode === 32 || evt.keyCode === 13) {
      headerAccessibilityToggle();
    }
  });

  // Add event listener to drawer for esc key
  obfuscator.addEventListener('click', function () {
    headerAccessibilityToggle();
  });

  /**************************/
  /* Accessibility Function */
  /**************************/
  // Variables needed by headerAccessibilityToggle() - Defined here for fewer queries to document
  var titleRow = document.querySelector('.site-header__title-row');
  var linkRow = document.querySelector('.site-header__link-row');
  var projectLinks = document.querySelector('.site-header__link-row .navigation__nested-links');
  var headerLinks = linkRow.getElementsByClassName('mdl-navigation__link');
  var drawerLinks = drawer.getElementsByClassName('mdl-navigation__link');

  // Initialize drawerLinks 'tabindex' to -1
  changeTabIndex(drawerLinks, '-1');

  // The function
  function headerAccessibilityToggle() {
    if (titleRow.getAttribute('aria-hidden') === 'false') {
      // Hide header info from screen-readers when drawer opens
      titleRow.setAttribute('aria-hidden', 'true');
      linkRow.setAttribute('aria-hidden', 'true');

      // Make sure keyboard users aren't tabbing through obfuscated links
      changeTabIndex(headerLinks, '-1');
      changeTabIndex(drawerLinks, '0');
    } else {
      // Show header info to screen-readers when the drawer closes
      titleRow.setAttribute('aria-hidden', 'false');
      linkRow.setAttribute('aria-hidden', 'false');
      // Hide nested navigation links in .site-header__link-row (because templating)
      projectLinks.setAttribute('aria-hidden', 'true');

      changeTabIndex(headerLinks, '0');
      changeTabIndex(drawerLinks, '-1');
    }
    // add tabindex -1 to header elements
  }

  function changeTabIndex(els, val) {
    for (var i = 0; i < els.length; i++) {
      els[i].setAttribute('tabindex', val);
    }
  }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1hdGVyaWFsLmpzIiwiYXBwLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdDRIQSxPQUFPLGdCQUFQLENBQXdCLE1BQXhCLEVBQWdDLFlBQVc7QUFDekM7O0FBRUEsTUFBSSxZQUFZLFNBQVMsYUFBVCxDQUF1Qix3QkFBdkIsQ0FBaEI7QUFDQSxNQUFJLFNBQVMsU0FBUyxhQUFULENBQXVCLHFCQUF2QixDQUFiO0FBQ0EsTUFBSSxlQUFlLFNBQVMsYUFBVCxDQUF1Qiw0QkFBdkIsQ0FBbkI7QUFDQSxNQUFJLGFBQWEsU0FBUyxhQUFULENBQXVCLHlCQUF2QixDQUFqQjs7OztBQUlBLFNBQU8sZ0JBQVAsQ0FBd0IsU0FBeEIsRUFBbUMsVUFBUyxHQUFULEVBQWM7QUFDL0MsUUFBSSxJQUFJLE9BQUosS0FBZ0IsRUFBaEIsSUFBc0IsT0FBTyxTQUFQLENBQWlCLFFBQWpCLENBQTBCLFlBQTFCLENBQTFCLEVBQW1FO0FBQ2pFO0FBQ0E7QUFDRDtBQUNGLEdBTEQ7O0FBT0EsV0FBUyxXQUFULEdBQXVCO0FBQ3JCLFdBQU8sU0FBUCxHQUFtQixvQkFBbkI7QUFDQSxlQUFXLFNBQVgsR0FBdUIsd0JBQXZCO0FBQ0Q7Ozs7O0FBS0QsZUFBYSxnQkFBYixDQUE4QixPQUE5QixFQUF1QyxZQUFXO0FBQ2hEO0FBQ0QsR0FGRDs7QUFJQSxlQUFhLGdCQUFiLENBQThCLFNBQTlCLEVBQXlDLFVBQVMsR0FBVCxFQUFjOzs7QUFHckQsUUFBSSxJQUFJLE9BQUosS0FBZ0IsRUFBaEIsSUFBc0IsSUFBSSxPQUFKLEtBQWdCLEVBQTFDLEVBQThDO0FBQzVDO0FBQ0Q7QUFDRixHQU5EOzs7QUFTQSxhQUFXLGdCQUFYLENBQTRCLE9BQTVCLEVBQXFDLFlBQVc7QUFDOUM7QUFDRCxHQUZEOzs7Ozs7QUFXQSxNQUFJLFdBQVcsU0FBUyxhQUFULENBQXVCLHlCQUF2QixDQUFmO0FBQ0EsTUFBSSxVQUFVLFNBQVMsYUFBVCxDQUF1Qix3QkFBdkIsQ0FBZDtBQUNBLE1BQUksZUFBZSxTQUFTLGFBQVQsQ0FBdUIsa0RBQXZCLENBQW5CO0FBQ0EsTUFBSSxjQUFjLFFBQVEsc0JBQVIsQ0FBK0Isc0JBQS9CLENBQWxCO0FBQ0EsTUFBSSxjQUFjLE9BQU8sc0JBQVAsQ0FBOEIsc0JBQTlCLENBQWxCOzs7QUFHQSxpQkFBZSxXQUFmLEVBQTRCLElBQTVCOzs7QUFHQSxXQUFTLHlCQUFULEdBQXFDO0FBQ25DLFFBQUksU0FBUyxZQUFULENBQXNCLGFBQXRCLE1BQXlDLE9BQTdDLEVBQXNEOztBQUVwRCxlQUFTLFlBQVQsQ0FBc0IsYUFBdEIsRUFBcUMsTUFBckM7QUFDQSxjQUFRLFlBQVIsQ0FBcUIsYUFBckIsRUFBb0MsTUFBcEM7OztBQUdBLHFCQUFlLFdBQWYsRUFBNEIsSUFBNUI7QUFDQSxxQkFBZSxXQUFmLEVBQTRCLEdBQTVCO0FBQ0QsS0FSRCxNQVFPOztBQUVMLGVBQVMsWUFBVCxDQUFzQixhQUF0QixFQUFxQyxPQUFyQztBQUNBLGNBQVEsWUFBUixDQUFxQixhQUFyQixFQUFvQyxPQUFwQzs7QUFFQSxtQkFBYSxZQUFiLENBQTBCLGFBQTFCLEVBQXlDLE1BQXpDOztBQUVBLHFCQUFlLFdBQWYsRUFBNEIsR0FBNUI7QUFDQSxxQkFBZSxXQUFmLEVBQTRCLElBQTVCO0FBQ0Q7O0FBRUY7O0FBRUQsV0FBUyxjQUFULENBQXdCLEdBQXhCLEVBQTZCLEdBQTdCLEVBQWtDO0FBQ2hDLFNBQUssSUFBSSxJQUFJLENBQWIsRUFBZ0IsSUFBSSxJQUFJLE1BQXhCLEVBQWdDLEdBQWhDLEVBQXFDO0FBQ25DLFVBQUksQ0FBSixFQUFPLFlBQVAsQ0FBb0IsVUFBcEIsRUFBZ0MsR0FBaEM7QUFDRDtBQUNGO0FBQ0YsQ0F0RkQiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCkge1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE1IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG4vKipcbiAqIEEgY29tcG9uZW50IGhhbmRsZXIgaW50ZXJmYWNlIHVzaW5nIHRoZSByZXZlYWxpbmcgbW9kdWxlIGRlc2lnbiBwYXR0ZXJuLlxuICogTW9yZSBkZXRhaWxzIG9uIHRoaXMgZGVzaWduIHBhdHRlcm4gaGVyZTpcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9qYXNvbm1heWVzL21kbC1jb21wb25lbnQtZGVzaWduLXBhdHRlcm5cbiAqXG4gKiBAYXV0aG9yIEphc29uIE1heWVzLlxuICovXG4vKiBleHBvcnRlZCBjb21wb25lbnRIYW5kbGVyICovXG5cbi8vIFByZS1kZWZpbmluZyB0aGUgY29tcG9uZW50SGFuZGxlciBpbnRlcmZhY2UsIGZvciBjbG9zdXJlIGRvY3VtZW50YXRpb24gYW5kXG4vLyBzdGF0aWMgdmVyaWZpY2F0aW9uLlxudmFyIGNvbXBvbmVudEhhbmRsZXIgPSB7XG4gIC8qKlxuICAgKiBTZWFyY2hlcyBleGlzdGluZyBET00gZm9yIGVsZW1lbnRzIG9mIG91ciBjb21wb25lbnQgdHlwZSBhbmQgdXBncmFkZXMgdGhlbVxuICAgKiBpZiB0aGV5IGhhdmUgbm90IGFscmVhZHkgYmVlbiB1cGdyYWRlZC5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmc9fSBvcHRKc0NsYXNzIHRoZSBwcm9ncmFtYXRpYyBuYW1lIG9mIHRoZSBlbGVtZW50IGNsYXNzIHdlXG4gICAqIG5lZWQgdG8gY3JlYXRlIGEgbmV3IGluc3RhbmNlIG9mLlxuICAgKiBAcGFyYW0ge3N0cmluZz19IG9wdENzc0NsYXNzIHRoZSBuYW1lIG9mIHRoZSBDU1MgY2xhc3MgZWxlbWVudHMgb2YgdGhpc1xuICAgKiB0eXBlIHdpbGwgaGF2ZS5cbiAgICovXG4gIHVwZ3JhZGVEb206IGZ1bmN0aW9uKG9wdEpzQ2xhc3MsIG9wdENzc0NsYXNzKSB7fSxcbiAgLyoqXG4gICAqIFVwZ3JhZGVzIGEgc3BlY2lmaWMgZWxlbWVudCByYXRoZXIgdGhhbiBhbGwgaW4gdGhlIERPTS5cbiAgICpcbiAgICogQHBhcmFtIHshRWxlbWVudH0gZWxlbWVudCBUaGUgZWxlbWVudCB3ZSB3aXNoIHRvIHVwZ3JhZGUuXG4gICAqIEBwYXJhbSB7c3RyaW5nPX0gb3B0SnNDbGFzcyBPcHRpb25hbCBuYW1lIG9mIHRoZSBjbGFzcyB3ZSB3YW50IHRvIHVwZ3JhZGVcbiAgICogdGhlIGVsZW1lbnQgdG8uXG4gICAqL1xuICB1cGdyYWRlRWxlbWVudDogZnVuY3Rpb24oZWxlbWVudCwgb3B0SnNDbGFzcykge30sXG4gIC8qKlxuICAgKiBVcGdyYWRlcyBhIHNwZWNpZmljIGxpc3Qgb2YgZWxlbWVudHMgcmF0aGVyIHRoYW4gYWxsIGluIHRoZSBET00uXG4gICAqXG4gICAqIEBwYXJhbSB7IUVsZW1lbnR8IUFycmF5PCFFbGVtZW50PnwhTm9kZUxpc3R8IUhUTUxDb2xsZWN0aW9ufSBlbGVtZW50c1xuICAgKiBUaGUgZWxlbWVudHMgd2Ugd2lzaCB0byB1cGdyYWRlLlxuICAgKi9cbiAgdXBncmFkZUVsZW1lbnRzOiBmdW5jdGlvbihlbGVtZW50cykge30sXG4gIC8qKlxuICAgKiBVcGdyYWRlcyBhbGwgcmVnaXN0ZXJlZCBjb21wb25lbnRzIGZvdW5kIGluIHRoZSBjdXJyZW50IERPTS4gVGhpcyBpc1xuICAgKiBhdXRvbWF0aWNhbGx5IGNhbGxlZCBvbiB3aW5kb3cgbG9hZC5cbiAgICovXG4gIHVwZ3JhZGVBbGxSZWdpc3RlcmVkOiBmdW5jdGlvbigpIHt9LFxuICAvKipcbiAgICogQWxsb3dzIHVzZXIgdG8gYmUgYWxlcnRlZCB0byBhbnkgdXBncmFkZXMgdGhhdCBhcmUgcGVyZm9ybWVkIGZvciBhIGdpdmVuXG4gICAqIGNvbXBvbmVudCB0eXBlXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBqc0NsYXNzIFRoZSBjbGFzcyBuYW1lIG9mIHRoZSBNREwgY29tcG9uZW50IHdlIHdpc2hcbiAgICogdG8gaG9vayBpbnRvIGZvciBhbnkgdXBncmFkZXMgcGVyZm9ybWVkLlxuICAgKiBAcGFyYW0ge2Z1bmN0aW9uKCFIVE1MRWxlbWVudCl9IGNhbGxiYWNrIFRoZSBmdW5jdGlvbiB0byBjYWxsIHVwb24gYW5cbiAgICogdXBncmFkZS4gVGhpcyBmdW5jdGlvbiBzaG91bGQgZXhwZWN0IDEgcGFyYW1ldGVyIC0gdGhlIEhUTUxFbGVtZW50IHdoaWNoXG4gICAqIGdvdCB1cGdyYWRlZC5cbiAgICovXG4gIHJlZ2lzdGVyVXBncmFkZWRDYWxsYmFjazogZnVuY3Rpb24oanNDbGFzcywgY2FsbGJhY2spIHt9LFxuICAvKipcbiAgICogUmVnaXN0ZXJzIGEgY2xhc3MgZm9yIGZ1dHVyZSB1c2UgYW5kIGF0dGVtcHRzIHRvIHVwZ3JhZGUgZXhpc3RpbmcgRE9NLlxuICAgKlxuICAgKiBAcGFyYW0ge2NvbXBvbmVudEhhbmRsZXIuQ29tcG9uZW50Q29uZmlnUHVibGljfSBjb25maWcgdGhlIHJlZ2lzdHJhdGlvbiBjb25maWd1cmF0aW9uXG4gICAqL1xuICByZWdpc3RlcjogZnVuY3Rpb24oY29uZmlnKSB7fSxcbiAgLyoqXG4gICAqIERvd25ncmFkZSBlaXRoZXIgYSBnaXZlbiBub2RlLCBhbiBhcnJheSBvZiBub2Rlcywgb3IgYSBOb2RlTGlzdC5cbiAgICpcbiAgICogQHBhcmFtIHshTm9kZXwhQXJyYXk8IU5vZGU+fCFOb2RlTGlzdH0gbm9kZXNcbiAgICovXG4gIGRvd25ncmFkZUVsZW1lbnRzOiBmdW5jdGlvbihub2Rlcykge31cbn07XG5cbmNvbXBvbmVudEhhbmRsZXIgPSAoZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvKiogQHR5cGUgeyFBcnJheTxjb21wb25lbnRIYW5kbGVyLkNvbXBvbmVudENvbmZpZz59ICovXG4gIHZhciByZWdpc3RlcmVkQ29tcG9uZW50c18gPSBbXTtcblxuICAvKiogQHR5cGUgeyFBcnJheTxjb21wb25lbnRIYW5kbGVyLkNvbXBvbmVudD59ICovXG4gIHZhciBjcmVhdGVkQ29tcG9uZW50c18gPSBbXTtcblxuICB2YXIgY29tcG9uZW50Q29uZmlnUHJvcGVydHlfID0gJ21kbENvbXBvbmVudENvbmZpZ0ludGVybmFsXyc7XG5cbiAgLyoqXG4gICAqIFNlYXJjaGVzIHJlZ2lzdGVyZWQgY29tcG9uZW50cyBmb3IgYSBjbGFzcyB3ZSBhcmUgaW50ZXJlc3RlZCBpbiB1c2luZy5cbiAgICogT3B0aW9uYWxseSByZXBsYWNlcyBhIG1hdGNoIHdpdGggcGFzc2VkIG9iamVjdCBpZiBzcGVjaWZpZWQuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIFRoZSBuYW1lIG9mIGEgY2xhc3Mgd2Ugd2FudCB0byB1c2UuXG4gICAqIEBwYXJhbSB7Y29tcG9uZW50SGFuZGxlci5Db21wb25lbnRDb25maWc9fSBvcHRSZXBsYWNlIE9wdGlvbmFsIG9iamVjdCB0byByZXBsYWNlIG1hdGNoIHdpdGguXG4gICAqIEByZXR1cm4geyFPYmplY3R8Ym9vbGVhbn1cbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIGZpbmRSZWdpc3RlcmVkQ2xhc3NfKG5hbWUsIG9wdFJlcGxhY2UpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlZ2lzdGVyZWRDb21wb25lbnRzXy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHJlZ2lzdGVyZWRDb21wb25lbnRzX1tpXS5jbGFzc05hbWUgPT09IG5hbWUpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRSZXBsYWNlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIHJlZ2lzdGVyZWRDb21wb25lbnRzX1tpXSA9IG9wdFJlcGxhY2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlZ2lzdGVyZWRDb21wb25lbnRzX1tpXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYW4gYXJyYXkgb2YgdGhlIGNsYXNzTmFtZXMgb2YgdGhlIHVwZ3JhZGVkIGNsYXNzZXMgb24gdGhlIGVsZW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSB7IUVsZW1lbnR9IGVsZW1lbnQgVGhlIGVsZW1lbnQgdG8gZmV0Y2ggZGF0YSBmcm9tLlxuICAgKiBAcmV0dXJuIHshQXJyYXk8c3RyaW5nPn1cbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIGdldFVwZ3JhZGVkTGlzdE9mRWxlbWVudF8oZWxlbWVudCkge1xuICAgIHZhciBkYXRhVXBncmFkZWQgPSBlbGVtZW50LmdldEF0dHJpYnV0ZSgnZGF0YS11cGdyYWRlZCcpO1xuICAgIC8vIFVzZSBgWycnXWAgYXMgZGVmYXVsdCB2YWx1ZSB0byBjb25mb3JtIHRoZSBgLG5hbWUsbmFtZS4uLmAgc3R5bGUuXG4gICAgcmV0dXJuIGRhdGFVcGdyYWRlZCA9PT0gbnVsbCA/IFsnJ10gOiBkYXRhVXBncmFkZWQuc3BsaXQoJywnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIGVsZW1lbnQgaGFzIGFscmVhZHkgYmVlbiB1cGdyYWRlZCBmb3IgdGhlIGdpdmVuXG4gICAqIGNsYXNzLlxuICAgKlxuICAgKiBAcGFyYW0geyFFbGVtZW50fSBlbGVtZW50IFRoZSBlbGVtZW50IHdlIHdhbnQgdG8gY2hlY2suXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBqc0NsYXNzIFRoZSBjbGFzcyB0byBjaGVjayBmb3IuXG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gaXNFbGVtZW50VXBncmFkZWRfKGVsZW1lbnQsIGpzQ2xhc3MpIHtcbiAgICB2YXIgdXBncmFkZWRMaXN0ID0gZ2V0VXBncmFkZWRMaXN0T2ZFbGVtZW50XyhlbGVtZW50KTtcbiAgICByZXR1cm4gdXBncmFkZWRMaXN0LmluZGV4T2YoanNDbGFzcykgIT09IC0xO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlYXJjaGVzIGV4aXN0aW5nIERPTSBmb3IgZWxlbWVudHMgb2Ygb3VyIGNvbXBvbmVudCB0eXBlIGFuZCB1cGdyYWRlcyB0aGVtXG4gICAqIGlmIHRoZXkgaGF2ZSBub3QgYWxyZWFkeSBiZWVuIHVwZ3JhZGVkLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZz19IG9wdEpzQ2xhc3MgdGhlIHByb2dyYW1hdGljIG5hbWUgb2YgdGhlIGVsZW1lbnQgY2xhc3Mgd2VcbiAgICogbmVlZCB0byBjcmVhdGUgYSBuZXcgaW5zdGFuY2Ugb2YuXG4gICAqIEBwYXJhbSB7c3RyaW5nPX0gb3B0Q3NzQ2xhc3MgdGhlIG5hbWUgb2YgdGhlIENTUyBjbGFzcyBlbGVtZW50cyBvZiB0aGlzXG4gICAqIHR5cGUgd2lsbCBoYXZlLlxuICAgKi9cbiAgZnVuY3Rpb24gdXBncmFkZURvbUludGVybmFsKG9wdEpzQ2xhc3MsIG9wdENzc0NsYXNzKSB7XG4gICAgaWYgKHR5cGVvZiBvcHRKc0NsYXNzID09PSAndW5kZWZpbmVkJyAmJlxuICAgICAgICB0eXBlb2Ygb3B0Q3NzQ2xhc3MgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlZ2lzdGVyZWRDb21wb25lbnRzXy5sZW5ndGg7IGkrKykge1xuICAgICAgICB1cGdyYWRlRG9tSW50ZXJuYWwocmVnaXN0ZXJlZENvbXBvbmVudHNfW2ldLmNsYXNzTmFtZSxcbiAgICAgICAgICAgIHJlZ2lzdGVyZWRDb21wb25lbnRzX1tpXS5jc3NDbGFzcyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBqc0NsYXNzID0gLyoqIEB0eXBlIHtzdHJpbmd9ICovIChvcHRKc0NsYXNzKTtcbiAgICAgIGlmICh0eXBlb2Ygb3B0Q3NzQ2xhc3MgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHZhciByZWdpc3RlcmVkQ2xhc3MgPSBmaW5kUmVnaXN0ZXJlZENsYXNzXyhqc0NsYXNzKTtcbiAgICAgICAgaWYgKHJlZ2lzdGVyZWRDbGFzcykge1xuICAgICAgICAgIG9wdENzc0NsYXNzID0gcmVnaXN0ZXJlZENsYXNzLmNzc0NsYXNzO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHZhciBlbGVtZW50cyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy4nICsgb3B0Q3NzQ2xhc3MpO1xuICAgICAgZm9yICh2YXIgbiA9IDA7IG4gPCBlbGVtZW50cy5sZW5ndGg7IG4rKykge1xuICAgICAgICB1cGdyYWRlRWxlbWVudEludGVybmFsKGVsZW1lbnRzW25dLCBqc0NsYXNzKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVXBncmFkZXMgYSBzcGVjaWZpYyBlbGVtZW50IHJhdGhlciB0aGFuIGFsbCBpbiB0aGUgRE9NLlxuICAgKlxuICAgKiBAcGFyYW0geyFFbGVtZW50fSBlbGVtZW50IFRoZSBlbGVtZW50IHdlIHdpc2ggdG8gdXBncmFkZS5cbiAgICogQHBhcmFtIHtzdHJpbmc9fSBvcHRKc0NsYXNzIE9wdGlvbmFsIG5hbWUgb2YgdGhlIGNsYXNzIHdlIHdhbnQgdG8gdXBncmFkZVxuICAgKiB0aGUgZWxlbWVudCB0by5cbiAgICovXG4gIGZ1bmN0aW9uIHVwZ3JhZGVFbGVtZW50SW50ZXJuYWwoZWxlbWVudCwgb3B0SnNDbGFzcykge1xuICAgIC8vIFZlcmlmeSBhcmd1bWVudCB0eXBlLlxuICAgIGlmICghKHR5cGVvZiBlbGVtZW50ID09PSAnb2JqZWN0JyAmJiBlbGVtZW50IGluc3RhbmNlb2YgRWxlbWVudCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBhcmd1bWVudCBwcm92aWRlZCB0byB1cGdyYWRlIE1ETCBlbGVtZW50LicpO1xuICAgIH1cbiAgICB2YXIgdXBncmFkZWRMaXN0ID0gZ2V0VXBncmFkZWRMaXN0T2ZFbGVtZW50XyhlbGVtZW50KTtcbiAgICB2YXIgY2xhc3Nlc1RvVXBncmFkZSA9IFtdO1xuICAgIC8vIElmIGpzQ2xhc3MgaXMgbm90IHByb3ZpZGVkIHNjYW4gdGhlIHJlZ2lzdGVyZWQgY29tcG9uZW50cyB0byBmaW5kIHRoZVxuICAgIC8vIG9uZXMgbWF0Y2hpbmcgdGhlIGVsZW1lbnQncyBDU1MgY2xhc3NMaXN0LlxuICAgIGlmICghb3B0SnNDbGFzcykge1xuICAgICAgdmFyIGNsYXNzTGlzdCA9IGVsZW1lbnQuY2xhc3NMaXN0O1xuICAgICAgcmVnaXN0ZXJlZENvbXBvbmVudHNfLmZvckVhY2goZnVuY3Rpb24oY29tcG9uZW50KSB7XG4gICAgICAgIC8vIE1hdGNoIENTUyAmIE5vdCB0byBiZSB1cGdyYWRlZCAmIE5vdCB1cGdyYWRlZC5cbiAgICAgICAgaWYgKGNsYXNzTGlzdC5jb250YWlucyhjb21wb25lbnQuY3NzQ2xhc3MpICYmXG4gICAgICAgICAgICBjbGFzc2VzVG9VcGdyYWRlLmluZGV4T2YoY29tcG9uZW50KSA9PT0gLTEgJiZcbiAgICAgICAgICAgICFpc0VsZW1lbnRVcGdyYWRlZF8oZWxlbWVudCwgY29tcG9uZW50LmNsYXNzTmFtZSkpIHtcbiAgICAgICAgICBjbGFzc2VzVG9VcGdyYWRlLnB1c2goY29tcG9uZW50KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBlbHNlIGlmICghaXNFbGVtZW50VXBncmFkZWRfKGVsZW1lbnQsIG9wdEpzQ2xhc3MpKSB7XG4gICAgICBjbGFzc2VzVG9VcGdyYWRlLnB1c2goZmluZFJlZ2lzdGVyZWRDbGFzc18ob3B0SnNDbGFzcykpO1xuICAgIH1cblxuICAgIC8vIFVwZ3JhZGUgdGhlIGVsZW1lbnQgZm9yIGVhY2ggY2xhc3Nlcy5cbiAgICBmb3IgKHZhciBpID0gMCwgbiA9IGNsYXNzZXNUb1VwZ3JhZGUubGVuZ3RoLCByZWdpc3RlcmVkQ2xhc3M7IGkgPCBuOyBpKyspIHtcbiAgICAgIHJlZ2lzdGVyZWRDbGFzcyA9IGNsYXNzZXNUb1VwZ3JhZGVbaV07XG4gICAgICBpZiAocmVnaXN0ZXJlZENsYXNzKSB7XG4gICAgICAgIC8vIE1hcmsgZWxlbWVudCBhcyB1cGdyYWRlZC5cbiAgICAgICAgdXBncmFkZWRMaXN0LnB1c2gocmVnaXN0ZXJlZENsYXNzLmNsYXNzTmFtZSk7XG4gICAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKCdkYXRhLXVwZ3JhZGVkJywgdXBncmFkZWRMaXN0LmpvaW4oJywnKSk7XG4gICAgICAgIHZhciBpbnN0YW5jZSA9IG5ldyByZWdpc3RlcmVkQ2xhc3MuY2xhc3NDb25zdHJ1Y3RvcihlbGVtZW50KTtcbiAgICAgICAgaW5zdGFuY2VbY29tcG9uZW50Q29uZmlnUHJvcGVydHlfXSA9IHJlZ2lzdGVyZWRDbGFzcztcbiAgICAgICAgY3JlYXRlZENvbXBvbmVudHNfLnB1c2goaW5zdGFuY2UpO1xuICAgICAgICAvLyBDYWxsIGFueSBjYWxsYmFja3MgdGhlIHVzZXIgaGFzIHJlZ2lzdGVyZWQgd2l0aCB0aGlzIGNvbXBvbmVudCB0eXBlLlxuICAgICAgICBmb3IgKHZhciBqID0gMCwgbSA9IHJlZ2lzdGVyZWRDbGFzcy5jYWxsYmFja3MubGVuZ3RoOyBqIDwgbTsgaisrKSB7XG4gICAgICAgICAgcmVnaXN0ZXJlZENsYXNzLmNhbGxiYWNrc1tqXShlbGVtZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZWdpc3RlcmVkQ2xhc3Mud2lkZ2V0KSB7XG4gICAgICAgICAgLy8gQXNzaWduIHBlciBlbGVtZW50IGluc3RhbmNlIGZvciBjb250cm9sIG92ZXIgQVBJXG4gICAgICAgICAgZWxlbWVudFtyZWdpc3RlcmVkQ2xhc3MuY2xhc3NOYW1lXSA9IGluc3RhbmNlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ1VuYWJsZSB0byBmaW5kIGEgcmVnaXN0ZXJlZCBjb21wb25lbnQgZm9yIHRoZSBnaXZlbiBjbGFzcy4nKTtcbiAgICAgIH1cblxuICAgICAgdmFyIGV2O1xuICAgICAgaWYgKCdDdXN0b21FdmVudCcgaW4gd2luZG93ICYmIHR5cGVvZiB3aW5kb3cuQ3VzdG9tRXZlbnQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgZXYgPSBuZXcgRXZlbnQoJ21kbC1jb21wb25lbnR1cGdyYWRlZCcsIHtcbiAgICAgICAgICAnYnViYmxlcyc6IHRydWUsICdjYW5jZWxhYmxlJzogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBldiA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudHMnKTtcbiAgICAgICAgZXYuaW5pdEV2ZW50KCdtZGwtY29tcG9uZW50dXBncmFkZWQnLCB0cnVlLCB0cnVlKTtcbiAgICAgIH1cbiAgICAgIGVsZW1lbnQuZGlzcGF0Y2hFdmVudChldik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFVwZ3JhZGVzIGEgc3BlY2lmaWMgbGlzdCBvZiBlbGVtZW50cyByYXRoZXIgdGhhbiBhbGwgaW4gdGhlIERPTS5cbiAgICpcbiAgICogQHBhcmFtIHshRWxlbWVudHwhQXJyYXk8IUVsZW1lbnQ+fCFOb2RlTGlzdHwhSFRNTENvbGxlY3Rpb259IGVsZW1lbnRzXG4gICAqIFRoZSBlbGVtZW50cyB3ZSB3aXNoIHRvIHVwZ3JhZGUuXG4gICAqL1xuICBmdW5jdGlvbiB1cGdyYWRlRWxlbWVudHNJbnRlcm5hbChlbGVtZW50cykge1xuICAgIGlmICghQXJyYXkuaXNBcnJheShlbGVtZW50cykpIHtcbiAgICAgIGlmICh0eXBlb2YgZWxlbWVudHMuaXRlbSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBlbGVtZW50cyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKC8qKiBAdHlwZSB7QXJyYXl9ICovIChlbGVtZW50cykpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZWxlbWVudHMgPSBbZWxlbWVudHNdO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKHZhciBpID0gMCwgbiA9IGVsZW1lbnRzLmxlbmd0aCwgZWxlbWVudDsgaSA8IG47IGkrKykge1xuICAgICAgZWxlbWVudCA9IGVsZW1lbnRzW2ldO1xuICAgICAgaWYgKGVsZW1lbnQgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkge1xuICAgICAgICB1cGdyYWRlRWxlbWVudEludGVybmFsKGVsZW1lbnQpO1xuICAgICAgICBpZiAoZWxlbWVudC5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdXBncmFkZUVsZW1lbnRzSW50ZXJuYWwoZWxlbWVudC5jaGlsZHJlbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVnaXN0ZXJzIGEgY2xhc3MgZm9yIGZ1dHVyZSB1c2UgYW5kIGF0dGVtcHRzIHRvIHVwZ3JhZGUgZXhpc3RpbmcgRE9NLlxuICAgKlxuICAgKiBAcGFyYW0ge2NvbXBvbmVudEhhbmRsZXIuQ29tcG9uZW50Q29uZmlnUHVibGljfSBjb25maWdcbiAgICovXG4gIGZ1bmN0aW9uIHJlZ2lzdGVySW50ZXJuYWwoY29uZmlnKSB7XG4gICAgLy8gSW4gb3JkZXIgdG8gc3VwcG9ydCBib3RoIENsb3N1cmUtY29tcGlsZWQgYW5kIHVuY29tcGlsZWQgY29kZSBhY2Nlc3NpbmdcbiAgICAvLyB0aGlzIG1ldGhvZCwgd2UgbmVlZCB0byBhbGxvdyBmb3IgYm90aCB0aGUgZG90IGFuZCBhcnJheSBzeW50YXggZm9yXG4gICAgLy8gcHJvcGVydHkgYWNjZXNzLiBZb3UnbGwgdGhlcmVmb3JlIHNlZSB0aGUgYGZvby5iYXIgfHwgZm9vWydiYXInXWBcbiAgICAvLyBwYXR0ZXJuIHJlcGVhdGVkIGFjcm9zcyB0aGlzIG1ldGhvZC5cbiAgICB2YXIgd2lkZ2V0TWlzc2luZyA9ICh0eXBlb2YgY29uZmlnLndpZGdldCA9PT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgICAgdHlwZW9mIGNvbmZpZ1snd2lkZ2V0J10gPT09ICd1bmRlZmluZWQnKTtcbiAgICB2YXIgd2lkZ2V0ID0gdHJ1ZTtcblxuICAgIGlmICghd2lkZ2V0TWlzc2luZykge1xuICAgICAgd2lkZ2V0ID0gY29uZmlnLndpZGdldCB8fCBjb25maWdbJ3dpZGdldCddO1xuICAgIH1cblxuICAgIHZhciBuZXdDb25maWcgPSAvKiogQHR5cGUge2NvbXBvbmVudEhhbmRsZXIuQ29tcG9uZW50Q29uZmlnfSAqLyAoe1xuICAgICAgY2xhc3NDb25zdHJ1Y3RvcjogY29uZmlnLmNvbnN0cnVjdG9yIHx8IGNvbmZpZ1snY29uc3RydWN0b3InXSxcbiAgICAgIGNsYXNzTmFtZTogY29uZmlnLmNsYXNzQXNTdHJpbmcgfHwgY29uZmlnWydjbGFzc0FzU3RyaW5nJ10sXG4gICAgICBjc3NDbGFzczogY29uZmlnLmNzc0NsYXNzIHx8IGNvbmZpZ1snY3NzQ2xhc3MnXSxcbiAgICAgIHdpZGdldDogd2lkZ2V0LFxuICAgICAgY2FsbGJhY2tzOiBbXVxuICAgIH0pO1xuXG4gICAgcmVnaXN0ZXJlZENvbXBvbmVudHNfLmZvckVhY2goZnVuY3Rpb24oaXRlbSkge1xuICAgICAgaWYgKGl0ZW0uY3NzQ2xhc3MgPT09IG5ld0NvbmZpZy5jc3NDbGFzcykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBwcm92aWRlZCBjc3NDbGFzcyBoYXMgYWxyZWFkeSBiZWVuIHJlZ2lzdGVyZWQ6ICcgKyBpdGVtLmNzc0NsYXNzKTtcbiAgICAgIH1cbiAgICAgIGlmIChpdGVtLmNsYXNzTmFtZSA9PT0gbmV3Q29uZmlnLmNsYXNzTmFtZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBwcm92aWRlZCBjbGFzc05hbWUgaGFzIGFscmVhZHkgYmVlbiByZWdpc3RlcmVkJyk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAoY29uZmlnLmNvbnN0cnVjdG9yLnByb3RvdHlwZVxuICAgICAgICAuaGFzT3duUHJvcGVydHkoY29tcG9uZW50Q29uZmlnUHJvcGVydHlfKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICdNREwgY29tcG9uZW50IGNsYXNzZXMgbXVzdCBub3QgaGF2ZSAnICsgY29tcG9uZW50Q29uZmlnUHJvcGVydHlfICtcbiAgICAgICAgICAnIGRlZmluZWQgYXMgYSBwcm9wZXJ0eS4nKTtcbiAgICB9XG5cbiAgICB2YXIgZm91bmQgPSBmaW5kUmVnaXN0ZXJlZENsYXNzXyhjb25maWcuY2xhc3NBc1N0cmluZywgbmV3Q29uZmlnKTtcblxuICAgIGlmICghZm91bmQpIHtcbiAgICAgIHJlZ2lzdGVyZWRDb21wb25lbnRzXy5wdXNoKG5ld0NvbmZpZyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFsbG93cyB1c2VyIHRvIGJlIGFsZXJ0ZWQgdG8gYW55IHVwZ3JhZGVzIHRoYXQgYXJlIHBlcmZvcm1lZCBmb3IgYSBnaXZlblxuICAgKiBjb21wb25lbnQgdHlwZVxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30ganNDbGFzcyBUaGUgY2xhc3MgbmFtZSBvZiB0aGUgTURMIGNvbXBvbmVudCB3ZSB3aXNoXG4gICAqIHRvIGhvb2sgaW50byBmb3IgYW55IHVwZ3JhZGVzIHBlcmZvcm1lZC5cbiAgICogQHBhcmFtIHtmdW5jdGlvbighSFRNTEVsZW1lbnQpfSBjYWxsYmFjayBUaGUgZnVuY3Rpb24gdG8gY2FsbCB1cG9uIGFuXG4gICAqIHVwZ3JhZGUuIFRoaXMgZnVuY3Rpb24gc2hvdWxkIGV4cGVjdCAxIHBhcmFtZXRlciAtIHRoZSBIVE1MRWxlbWVudCB3aGljaFxuICAgKiBnb3QgdXBncmFkZWQuXG4gICAqL1xuICBmdW5jdGlvbiByZWdpc3RlclVwZ3JhZGVkQ2FsbGJhY2tJbnRlcm5hbChqc0NsYXNzLCBjYWxsYmFjaykge1xuICAgIHZhciByZWdDbGFzcyA9IGZpbmRSZWdpc3RlcmVkQ2xhc3NfKGpzQ2xhc3MpO1xuICAgIGlmIChyZWdDbGFzcykge1xuICAgICAgcmVnQ2xhc3MuY2FsbGJhY2tzLnB1c2goY2FsbGJhY2spO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBVcGdyYWRlcyBhbGwgcmVnaXN0ZXJlZCBjb21wb25lbnRzIGZvdW5kIGluIHRoZSBjdXJyZW50IERPTS4gVGhpcyBpc1xuICAgKiBhdXRvbWF0aWNhbGx5IGNhbGxlZCBvbiB3aW5kb3cgbG9hZC5cbiAgICovXG4gIGZ1bmN0aW9uIHVwZ3JhZGVBbGxSZWdpc3RlcmVkSW50ZXJuYWwoKSB7XG4gICAgZm9yICh2YXIgbiA9IDA7IG4gPCByZWdpc3RlcmVkQ29tcG9uZW50c18ubGVuZ3RoOyBuKyspIHtcbiAgICAgIHVwZ3JhZGVEb21JbnRlcm5hbChyZWdpc3RlcmVkQ29tcG9uZW50c19bbl0uY2xhc3NOYW1lKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgdGhlIGNvbXBvbmVudCBmb3IgdGhlIGRvd25ncmFkZSBtZXRob2QuXG4gICAqIEV4ZWN1dGUgaWYgZm91bmQuXG4gICAqIFJlbW92ZSBjb21wb25lbnQgZnJvbSBjcmVhdGVkQ29tcG9uZW50cyBsaXN0LlxuICAgKlxuICAgKiBAcGFyYW0gez9jb21wb25lbnRIYW5kbGVyLkNvbXBvbmVudH0gY29tcG9uZW50XG4gICAqL1xuICBmdW5jdGlvbiBkZWNvbnN0cnVjdENvbXBvbmVudEludGVybmFsKGNvbXBvbmVudCkge1xuICAgIGlmIChjb21wb25lbnQpIHtcbiAgICAgIHZhciBjb21wb25lbnRJbmRleCA9IGNyZWF0ZWRDb21wb25lbnRzXy5pbmRleE9mKGNvbXBvbmVudCk7XG4gICAgICBjcmVhdGVkQ29tcG9uZW50c18uc3BsaWNlKGNvbXBvbmVudEluZGV4LCAxKTtcblxuICAgICAgdmFyIHVwZ3JhZGVzID0gY29tcG9uZW50LmVsZW1lbnRfLmdldEF0dHJpYnV0ZSgnZGF0YS11cGdyYWRlZCcpLnNwbGl0KCcsJyk7XG4gICAgICB2YXIgY29tcG9uZW50UGxhY2UgPSB1cGdyYWRlcy5pbmRleE9mKGNvbXBvbmVudFtjb21wb25lbnRDb25maWdQcm9wZXJ0eV9dLmNsYXNzQXNTdHJpbmcpO1xuICAgICAgdXBncmFkZXMuc3BsaWNlKGNvbXBvbmVudFBsYWNlLCAxKTtcbiAgICAgIGNvbXBvbmVudC5lbGVtZW50Xy5zZXRBdHRyaWJ1dGUoJ2RhdGEtdXBncmFkZWQnLCB1cGdyYWRlcy5qb2luKCcsJykpO1xuXG4gICAgICB2YXIgZXY7XG4gICAgICBpZiAoJ0N1c3RvbUV2ZW50JyBpbiB3aW5kb3cgJiYgdHlwZW9mIHdpbmRvdy5DdXN0b21FdmVudCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBldiA9IG5ldyBFdmVudCgnbWRsLWNvbXBvbmVudGRvd25ncmFkZWQnLCB7XG4gICAgICAgICAgJ2J1YmJsZXMnOiB0cnVlLCAnY2FuY2VsYWJsZSc6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXYgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnRzJyk7XG4gICAgICAgIGV2LmluaXRFdmVudCgnbWRsLWNvbXBvbmVudGRvd25ncmFkZWQnLCB0cnVlLCB0cnVlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRG93bmdyYWRlIGVpdGhlciBhIGdpdmVuIG5vZGUsIGFuIGFycmF5IG9mIG5vZGVzLCBvciBhIE5vZGVMaXN0LlxuICAgKlxuICAgKiBAcGFyYW0geyFOb2RlfCFBcnJheTwhTm9kZT58IU5vZGVMaXN0fSBub2Rlc1xuICAgKi9cbiAgZnVuY3Rpb24gZG93bmdyYWRlTm9kZXNJbnRlcm5hbChub2Rlcykge1xuICAgIC8qKlxuICAgICAqIEF1eGlsaWFyeSBmdW5jdGlvbiB0byBkb3duZ3JhZGUgYSBzaW5nbGUgbm9kZS5cbiAgICAgKiBAcGFyYW0gIHshTm9kZX0gbm9kZSB0aGUgbm9kZSB0byBiZSBkb3duZ3JhZGVkXG4gICAgICovXG4gICAgdmFyIGRvd25ncmFkZU5vZGUgPSBmdW5jdGlvbihub2RlKSB7XG4gICAgICBjcmVhdGVkQ29tcG9uZW50c18uZmlsdGVyKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIGl0ZW0uZWxlbWVudF8gPT09IG5vZGU7XG4gICAgICB9KS5mb3JFYWNoKGRlY29uc3RydWN0Q29tcG9uZW50SW50ZXJuYWwpO1xuICAgIH07XG4gICAgaWYgKG5vZGVzIGluc3RhbmNlb2YgQXJyYXkgfHwgbm9kZXMgaW5zdGFuY2VvZiBOb2RlTGlzdCkge1xuICAgICAgZm9yICh2YXIgbiA9IDA7IG4gPCBub2Rlcy5sZW5ndGg7IG4rKykge1xuICAgICAgICBkb3duZ3JhZGVOb2RlKG5vZGVzW25dKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKG5vZGVzIGluc3RhbmNlb2YgTm9kZSkge1xuICAgICAgZG93bmdyYWRlTm9kZShub2Rlcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBhcmd1bWVudCBwcm92aWRlZCB0byBkb3duZ3JhZGUgTURMIG5vZGVzLicpO1xuICAgIH1cbiAgfVxuXG4gIC8vIE5vdyByZXR1cm4gdGhlIGZ1bmN0aW9ucyB0aGF0IHNob3VsZCBiZSBtYWRlIHB1YmxpYyB3aXRoIHRoZWlyIHB1YmxpY2x5XG4gIC8vIGZhY2luZyBuYW1lcy4uLlxuICByZXR1cm4ge1xuICAgIHVwZ3JhZGVEb206IHVwZ3JhZGVEb21JbnRlcm5hbCxcbiAgICB1cGdyYWRlRWxlbWVudDogdXBncmFkZUVsZW1lbnRJbnRlcm5hbCxcbiAgICB1cGdyYWRlRWxlbWVudHM6IHVwZ3JhZGVFbGVtZW50c0ludGVybmFsLFxuICAgIHVwZ3JhZGVBbGxSZWdpc3RlcmVkOiB1cGdyYWRlQWxsUmVnaXN0ZXJlZEludGVybmFsLFxuICAgIHJlZ2lzdGVyVXBncmFkZWRDYWxsYmFjazogcmVnaXN0ZXJVcGdyYWRlZENhbGxiYWNrSW50ZXJuYWwsXG4gICAgcmVnaXN0ZXI6IHJlZ2lzdGVySW50ZXJuYWwsXG4gICAgZG93bmdyYWRlRWxlbWVudHM6IGRvd25ncmFkZU5vZGVzSW50ZXJuYWxcbiAgfTtcbn0pKCk7XG5cbi8qKlxuICogRGVzY3JpYmVzIHRoZSB0eXBlIG9mIGEgcmVnaXN0ZXJlZCBjb21wb25lbnQgdHlwZSBtYW5hZ2VkIGJ5XG4gKiBjb21wb25lbnRIYW5kbGVyLiBQcm92aWRlZCBmb3IgYmVuZWZpdCBvZiB0aGUgQ2xvc3VyZSBjb21waWxlci5cbiAqXG4gKiBAdHlwZWRlZiB7e1xuICogICBjb25zdHJ1Y3RvcjogRnVuY3Rpb24sXG4gKiAgIGNsYXNzQXNTdHJpbmc6IHN0cmluZyxcbiAqICAgY3NzQ2xhc3M6IHN0cmluZyxcbiAqICAgd2lkZ2V0OiAoc3RyaW5nfGJvb2xlYW58dW5kZWZpbmVkKVxuICogfX1cbiAqL1xuY29tcG9uZW50SGFuZGxlci5Db21wb25lbnRDb25maWdQdWJsaWM7ICAvLyBqc2hpbnQgaWdub3JlOmxpbmVcblxuLyoqXG4gKiBEZXNjcmliZXMgdGhlIHR5cGUgb2YgYSByZWdpc3RlcmVkIGNvbXBvbmVudCB0eXBlIG1hbmFnZWQgYnlcbiAqIGNvbXBvbmVudEhhbmRsZXIuIFByb3ZpZGVkIGZvciBiZW5lZml0IG9mIHRoZSBDbG9zdXJlIGNvbXBpbGVyLlxuICpcbiAqIEB0eXBlZGVmIHt7XG4gKiAgIGNvbnN0cnVjdG9yOiAhRnVuY3Rpb24sXG4gKiAgIGNsYXNzTmFtZTogc3RyaW5nLFxuICogICBjc3NDbGFzczogc3RyaW5nLFxuICogICB3aWRnZXQ6IChzdHJpbmd8Ym9vbGVhbiksXG4gKiAgIGNhbGxiYWNrczogIUFycmF5PGZ1bmN0aW9uKCFIVE1MRWxlbWVudCk+XG4gKiB9fVxuICovXG5jb21wb25lbnRIYW5kbGVyLkNvbXBvbmVudENvbmZpZzsgIC8vIGpzaGludCBpZ25vcmU6bGluZVxuXG4vKipcbiAqIENyZWF0ZWQgY29tcG9uZW50IChpLmUuLCB1cGdyYWRlZCBlbGVtZW50KSB0eXBlIGFzIG1hbmFnZWQgYnlcbiAqIGNvbXBvbmVudEhhbmRsZXIuIFByb3ZpZGVkIGZvciBiZW5lZml0IG9mIHRoZSBDbG9zdXJlIGNvbXBpbGVyLlxuICpcbiAqIEB0eXBlZGVmIHt7XG4gKiAgIGVsZW1lbnRfOiAhSFRNTEVsZW1lbnQsXG4gKiAgIGNsYXNzTmFtZTogc3RyaW5nLFxuICogICBjbGFzc0FzU3RyaW5nOiBzdHJpbmcsXG4gKiAgIGNzc0NsYXNzOiBzdHJpbmcsXG4gKiAgIHdpZGdldDogc3RyaW5nXG4gKiB9fVxuICovXG5jb21wb25lbnRIYW5kbGVyLkNvbXBvbmVudDsgIC8vIGpzaGludCBpZ25vcmU6bGluZVxuXG4vLyBFeHBvcnQgYWxsIHN5bWJvbHMsIGZvciB0aGUgYmVuZWZpdCBvZiBDbG9zdXJlIGNvbXBpbGVyLlxuLy8gTm8gZWZmZWN0IG9uIHVuY29tcGlsZWQgY29kZS5cbmNvbXBvbmVudEhhbmRsZXJbJ3VwZ3JhZGVEb20nXSA9IGNvbXBvbmVudEhhbmRsZXIudXBncmFkZURvbTtcbmNvbXBvbmVudEhhbmRsZXJbJ3VwZ3JhZGVFbGVtZW50J10gPSBjb21wb25lbnRIYW5kbGVyLnVwZ3JhZGVFbGVtZW50O1xuY29tcG9uZW50SGFuZGxlclsndXBncmFkZUVsZW1lbnRzJ10gPSBjb21wb25lbnRIYW5kbGVyLnVwZ3JhZGVFbGVtZW50cztcbmNvbXBvbmVudEhhbmRsZXJbJ3VwZ3JhZGVBbGxSZWdpc3RlcmVkJ10gPVxuICAgIGNvbXBvbmVudEhhbmRsZXIudXBncmFkZUFsbFJlZ2lzdGVyZWQ7XG5jb21wb25lbnRIYW5kbGVyWydyZWdpc3RlclVwZ3JhZGVkQ2FsbGJhY2snXSA9XG4gICAgY29tcG9uZW50SGFuZGxlci5yZWdpc3RlclVwZ3JhZGVkQ2FsbGJhY2s7XG5jb21wb25lbnRIYW5kbGVyWydyZWdpc3RlciddID0gY29tcG9uZW50SGFuZGxlci5yZWdpc3RlcjtcbmNvbXBvbmVudEhhbmRsZXJbJ2Rvd25ncmFkZUVsZW1lbnRzJ10gPSBjb21wb25lbnRIYW5kbGVyLmRvd25ncmFkZUVsZW1lbnRzO1xud2luZG93LmNvbXBvbmVudEhhbmRsZXIgPSBjb21wb25lbnRIYW5kbGVyO1xud2luZG93Wydjb21wb25lbnRIYW5kbGVyJ10gPSBjb21wb25lbnRIYW5kbGVyO1xuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLyoqXG4gICAqIFBlcmZvcm1zIGEgXCJDdXR0aW5nIHRoZSBtdXN0YXJkXCIgdGVzdC4gSWYgdGhlIGJyb3dzZXIgc3VwcG9ydHMgdGhlIGZlYXR1cmVzXG4gICAqIHRlc3RlZCwgYWRkcyBhIG1kbC1qcyBjbGFzcyB0byB0aGUgPGh0bWw+IGVsZW1lbnQuIEl0IHRoZW4gdXBncmFkZXMgYWxsIE1ETFxuICAgKiBjb21wb25lbnRzIHJlcXVpcmluZyBKYXZhU2NyaXB0LlxuICAgKi9cbiAgaWYgKCdjbGFzc0xpc3QnIGluIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpICYmXG4gICAgICAncXVlcnlTZWxlY3RvcicgaW4gZG9jdW1lbnQgJiZcbiAgICAgICdhZGRFdmVudExpc3RlbmVyJyBpbiB3aW5kb3cgJiYgQXJyYXkucHJvdG90eXBlLmZvckVhY2gpIHtcbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xhc3NMaXN0LmFkZCgnbWRsLWpzJyk7XG4gICAgY29tcG9uZW50SGFuZGxlci51cGdyYWRlQWxsUmVnaXN0ZXJlZCgpO1xuICB9IGVsc2Uge1xuICAgIC8qKlxuICAgICAqIER1bW15IGZ1bmN0aW9uIHRvIGF2b2lkIEpTIGVycm9ycy5cbiAgICAgKi9cbiAgICBjb21wb25lbnRIYW5kbGVyLnVwZ3JhZGVFbGVtZW50ID0gZnVuY3Rpb24oKSB7fTtcbiAgICAvKipcbiAgICAgKiBEdW1teSBmdW5jdGlvbiB0byBhdm9pZCBKUyBlcnJvcnMuXG4gICAgICovXG4gICAgY29tcG9uZW50SGFuZGxlci5yZWdpc3RlciA9IGZ1bmN0aW9uKCkge307XG4gIH1cbn0pO1xuXG4vLyBTb3VyY2U6IGh0dHBzOi8vZ2l0aHViLmNvbS9kYXJpdXMvcmVxdWVzdEFuaW1hdGlvbkZyYW1lL2Jsb2IvbWFzdGVyL3JlcXVlc3RBbmltYXRpb25GcmFtZS5qc1xuLy8gQWRhcHRlZCBmcm9tIGh0dHBzOi8vZ2lzdC5naXRodWIuY29tL3BhdWxpcmlzaC8xNTc5NjcxIHdoaWNoIGRlcml2ZWQgZnJvbVxuLy8gaHR0cDovL3BhdWxpcmlzaC5jb20vMjAxMS9yZXF1ZXN0YW5pbWF0aW9uZnJhbWUtZm9yLXNtYXJ0LWFuaW1hdGluZy9cbi8vIGh0dHA6Ly9teS5vcGVyYS5jb20vZW1vbGxlci9ibG9nLzIwMTEvMTIvMjAvcmVxdWVzdGFuaW1hdGlvbmZyYW1lLWZvci1zbWFydC1lci1hbmltYXRpbmdcbi8vIHJlcXVlc3RBbmltYXRpb25GcmFtZSBwb2x5ZmlsbCBieSBFcmlrIE3DtmxsZXIuXG4vLyBGaXhlcyBmcm9tIFBhdWwgSXJpc2gsIFRpbm8gWmlqZGVsLCBBbmRyZXcgTWFvLCBLbGVtZW4gU2xhdmnEjSwgRGFyaXVzIEJhY29uXG4vLyBNSVQgbGljZW5zZVxuaWYgKCFEYXRlLm5vdykge1xuICAgIC8qKlxuICAgKiBEYXRlLm5vdyBwb2x5ZmlsbC5cbiAgICogQHJldHVybiB7bnVtYmVyfSB0aGUgY3VycmVudCBEYXRlXG4gICAqL1xuICAgIERhdGUubm93ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgfTtcbiAgICBEYXRlWydub3cnXSA9IERhdGUubm93O1xufVxudmFyIHZlbmRvcnMgPSBbXG4gICAgJ3dlYmtpdCcsXG4gICAgJ21veidcbl07XG5mb3IgKHZhciBpID0gMDsgaSA8IHZlbmRvcnMubGVuZ3RoICYmICF3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lOyArK2kpIHtcbiAgICB2YXIgdnAgPSB2ZW5kb3JzW2ldO1xuICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSB3aW5kb3dbdnAgKyAnUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ107XG4gICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZwICsgJ0NhbmNlbEFuaW1hdGlvbkZyYW1lJ10gfHwgd2luZG93W3ZwICsgJ0NhbmNlbFJlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuICAgIHdpbmRvd1sncmVxdWVzdEFuaW1hdGlvbkZyYW1lJ10gPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lO1xuICAgIHdpbmRvd1snY2FuY2VsQW5pbWF0aW9uRnJhbWUnXSA9IHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZTtcbn1cbmlmICgvaVAoYWR8aG9uZXxvZCkuKk9TIDYvLnRlc3Qod2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQpIHx8ICF3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8ICF3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUpIHtcbiAgICB2YXIgbGFzdFRpbWUgPSAwO1xuICAgIC8qKlxuICAgKiByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgcG9seWZpbGwuXG4gICAqIEBwYXJhbSAgeyFGdW5jdGlvbn0gY2FsbGJhY2sgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgKi9cbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBub3cgPSBEYXRlLm5vdygpO1xuICAgICAgICB2YXIgbmV4dFRpbWUgPSBNYXRoLm1heChsYXN0VGltZSArIDE2LCBub3cpO1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhsYXN0VGltZSA9IG5leHRUaW1lKTtcbiAgICAgICAgfSwgbmV4dFRpbWUgLSBub3cpO1xuICAgIH07XG4gICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gY2xlYXJUaW1lb3V0O1xuICAgIHdpbmRvd1sncmVxdWVzdEFuaW1hdGlvbkZyYW1lJ10gPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lO1xuICAgIHdpbmRvd1snY2FuY2VsQW5pbWF0aW9uRnJhbWUnXSA9IHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZTtcbn1cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE1IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gICAqIENsYXNzIGNvbnN0cnVjdG9yIGZvciBCdXR0b24gTURMIGNvbXBvbmVudC5cbiAgICogSW1wbGVtZW50cyBNREwgY29tcG9uZW50IGRlc2lnbiBwYXR0ZXJuIGRlZmluZWQgYXQ6XG4gICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9qYXNvbm1heWVzL21kbC1jb21wb25lbnQtZGVzaWduLXBhdHRlcm5cbiAgICpcbiAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxlbWVudCBUaGUgZWxlbWVudCB0aGF0IHdpbGwgYmUgdXBncmFkZWQuXG4gICAqL1xudmFyIE1hdGVyaWFsQnV0dG9uID0gZnVuY3Rpb24gTWF0ZXJpYWxCdXR0b24oZWxlbWVudCkge1xuICAgIHRoaXMuZWxlbWVudF8gPSBlbGVtZW50O1xuICAgIC8vIEluaXRpYWxpemUgaW5zdGFuY2UuXG4gICAgdGhpcy5pbml0KCk7XG59O1xud2luZG93WydNYXRlcmlhbEJ1dHRvbiddID0gTWF0ZXJpYWxCdXR0b247XG4vKipcbiAgICogU3RvcmUgY29uc3RhbnRzIGluIG9uZSBwbGFjZSBzbyB0aGV5IGNhbiBiZSB1cGRhdGVkIGVhc2lseS5cbiAgICpcbiAgICogQGVudW0ge3N0cmluZyB8IG51bWJlcn1cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbEJ1dHRvbi5wcm90b3R5cGUuQ29uc3RhbnRfID0ge307XG4vKipcbiAgICogU3RvcmUgc3RyaW5ncyBmb3IgY2xhc3MgbmFtZXMgZGVmaW5lZCBieSB0aGlzIGNvbXBvbmVudCB0aGF0IGFyZSB1c2VkIGluXG4gICAqIEphdmFTY3JpcHQuIFRoaXMgYWxsb3dzIHVzIHRvIHNpbXBseSBjaGFuZ2UgaXQgaW4gb25lIHBsYWNlIHNob3VsZCB3ZVxuICAgKiBkZWNpZGUgdG8gbW9kaWZ5IGF0IGEgbGF0ZXIgZGF0ZS5cbiAgICpcbiAgICogQGVudW0ge3N0cmluZ31cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbEJ1dHRvbi5wcm90b3R5cGUuQ3NzQ2xhc3Nlc18gPSB7XG4gICAgUklQUExFX0VGRkVDVDogJ21kbC1qcy1yaXBwbGUtZWZmZWN0JyxcbiAgICBSSVBQTEVfQ09OVEFJTkVSOiAnbWRsLWJ1dHRvbl9fcmlwcGxlLWNvbnRhaW5lcicsXG4gICAgUklQUExFOiAnbWRsLXJpcHBsZSdcbn07XG4vKipcbiAgICogSGFuZGxlIGJsdXIgb2YgZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnQgVGhlIGV2ZW50IHRoYXQgZmlyZWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxCdXR0b24ucHJvdG90eXBlLmJsdXJIYW5kbGVyXyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIGlmIChldmVudCkge1xuICAgICAgICB0aGlzLmVsZW1lbnRfLmJsdXIoKTtcbiAgICB9XG59O1xuLy8gUHVibGljIG1ldGhvZHMuXG4vKipcbiAgICogRGlzYWJsZSBidXR0b24uXG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICovXG5NYXRlcmlhbEJ1dHRvbi5wcm90b3R5cGUuZGlzYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmVsZW1lbnRfLmRpc2FibGVkID0gdHJ1ZTtcbn07XG5NYXRlcmlhbEJ1dHRvbi5wcm90b3R5cGVbJ2Rpc2FibGUnXSA9IE1hdGVyaWFsQnV0dG9uLnByb3RvdHlwZS5kaXNhYmxlO1xuLyoqXG4gICAqIEVuYWJsZSBidXR0b24uXG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICovXG5NYXRlcmlhbEJ1dHRvbi5wcm90b3R5cGUuZW5hYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZWxlbWVudF8uZGlzYWJsZWQgPSBmYWxzZTtcbn07XG5NYXRlcmlhbEJ1dHRvbi5wcm90b3R5cGVbJ2VuYWJsZSddID0gTWF0ZXJpYWxCdXR0b24ucHJvdG90eXBlLmVuYWJsZTtcbi8qKlxuICAgKiBJbml0aWFsaXplIGVsZW1lbnQuXG4gICAqL1xuTWF0ZXJpYWxCdXR0b24ucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuZWxlbWVudF8pIHtcbiAgICAgICAgaWYgKHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uUklQUExFX0VGRkVDVCkpIHtcbiAgICAgICAgICAgIHZhciByaXBwbGVDb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICByaXBwbGVDb250YWluZXIuY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLlJJUFBMRV9DT05UQUlORVIpO1xuICAgICAgICAgICAgdGhpcy5yaXBwbGVFbGVtZW50XyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgIHRoaXMucmlwcGxlRWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLlJJUFBMRSk7XG4gICAgICAgICAgICByaXBwbGVDb250YWluZXIuYXBwZW5kQ2hpbGQodGhpcy5yaXBwbGVFbGVtZW50Xyk7XG4gICAgICAgICAgICB0aGlzLmJvdW5kUmlwcGxlQmx1ckhhbmRsZXIgPSB0aGlzLmJsdXJIYW5kbGVyXy5iaW5kKHRoaXMpO1xuICAgICAgICAgICAgdGhpcy5yaXBwbGVFbGVtZW50Xy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5ib3VuZFJpcHBsZUJsdXJIYW5kbGVyKTtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudF8uYXBwZW5kQ2hpbGQocmlwcGxlQ29udGFpbmVyKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmJvdW5kQnV0dG9uQmx1ckhhbmRsZXIgPSB0aGlzLmJsdXJIYW5kbGVyXy5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmVsZW1lbnRfLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCB0aGlzLmJvdW5kQnV0dG9uQmx1ckhhbmRsZXIpO1xuICAgICAgICB0aGlzLmVsZW1lbnRfLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbGVhdmUnLCB0aGlzLmJvdW5kQnV0dG9uQmx1ckhhbmRsZXIpO1xuICAgIH1cbn07XG4vLyBUaGUgY29tcG9uZW50IHJlZ2lzdGVycyBpdHNlbGYuIEl0IGNhbiBhc3N1bWUgY29tcG9uZW50SGFuZGxlciBpcyBhdmFpbGFibGVcbi8vIGluIHRoZSBnbG9iYWwgc2NvcGUuXG5jb21wb25lbnRIYW5kbGVyLnJlZ2lzdGVyKHtcbiAgICBjb25zdHJ1Y3RvcjogTWF0ZXJpYWxCdXR0b24sXG4gICAgY2xhc3NBc1N0cmluZzogJ01hdGVyaWFsQnV0dG9uJyxcbiAgICBjc3NDbGFzczogJ21kbC1qcy1idXR0b24nLFxuICAgIHdpZGdldDogdHJ1ZVxufSk7XG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNSBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICAgKiBDbGFzcyBjb25zdHJ1Y3RvciBmb3IgQ2hlY2tib3ggTURMIGNvbXBvbmVudC5cbiAgICogSW1wbGVtZW50cyBNREwgY29tcG9uZW50IGRlc2lnbiBwYXR0ZXJuIGRlZmluZWQgYXQ6XG4gICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9qYXNvbm1heWVzL21kbC1jb21wb25lbnQtZGVzaWduLXBhdHRlcm5cbiAgICpcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsZW1lbnQgVGhlIGVsZW1lbnQgdGhhdCB3aWxsIGJlIHVwZ3JhZGVkLlxuICAgKi9cbnZhciBNYXRlcmlhbENoZWNrYm94ID0gZnVuY3Rpb24gTWF0ZXJpYWxDaGVja2JveChlbGVtZW50KSB7XG4gICAgdGhpcy5lbGVtZW50XyA9IGVsZW1lbnQ7XG4gICAgLy8gSW5pdGlhbGl6ZSBpbnN0YW5jZS5cbiAgICB0aGlzLmluaXQoKTtcbn07XG53aW5kb3dbJ01hdGVyaWFsQ2hlY2tib3gnXSA9IE1hdGVyaWFsQ2hlY2tib3g7XG4vKipcbiAgICogU3RvcmUgY29uc3RhbnRzIGluIG9uZSBwbGFjZSBzbyB0aGV5IGNhbiBiZSB1cGRhdGVkIGVhc2lseS5cbiAgICpcbiAgICogQGVudW0ge3N0cmluZyB8IG51bWJlcn1cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbENoZWNrYm94LnByb3RvdHlwZS5Db25zdGFudF8gPSB7IFRJTllfVElNRU9VVDogMC4wMDEgfTtcbi8qKlxuICAgKiBTdG9yZSBzdHJpbmdzIGZvciBjbGFzcyBuYW1lcyBkZWZpbmVkIGJ5IHRoaXMgY29tcG9uZW50IHRoYXQgYXJlIHVzZWQgaW5cbiAgICogSmF2YVNjcmlwdC4gVGhpcyBhbGxvd3MgdXMgdG8gc2ltcGx5IGNoYW5nZSBpdCBpbiBvbmUgcGxhY2Ugc2hvdWxkIHdlXG4gICAqIGRlY2lkZSB0byBtb2RpZnkgYXQgYSBsYXRlciBkYXRlLlxuICAgKlxuICAgKiBAZW51bSB7c3RyaW5nfVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsQ2hlY2tib3gucHJvdG90eXBlLkNzc0NsYXNzZXNfID0ge1xuICAgIElOUFVUOiAnbWRsLWNoZWNrYm94X19pbnB1dCcsXG4gICAgQk9YX09VVExJTkU6ICdtZGwtY2hlY2tib3hfX2JveC1vdXRsaW5lJyxcbiAgICBGT0NVU19IRUxQRVI6ICdtZGwtY2hlY2tib3hfX2ZvY3VzLWhlbHBlcicsXG4gICAgVElDS19PVVRMSU5FOiAnbWRsLWNoZWNrYm94X190aWNrLW91dGxpbmUnLFxuICAgIFJJUFBMRV9FRkZFQ1Q6ICdtZGwtanMtcmlwcGxlLWVmZmVjdCcsXG4gICAgUklQUExFX0lHTk9SRV9FVkVOVFM6ICdtZGwtanMtcmlwcGxlLWVmZmVjdC0taWdub3JlLWV2ZW50cycsXG4gICAgUklQUExFX0NPTlRBSU5FUjogJ21kbC1jaGVja2JveF9fcmlwcGxlLWNvbnRhaW5lcicsXG4gICAgUklQUExFX0NFTlRFUjogJ21kbC1yaXBwbGUtLWNlbnRlcicsXG4gICAgUklQUExFOiAnbWRsLXJpcHBsZScsXG4gICAgSVNfRk9DVVNFRDogJ2lzLWZvY3VzZWQnLFxuICAgIElTX0RJU0FCTEVEOiAnaXMtZGlzYWJsZWQnLFxuICAgIElTX0NIRUNLRUQ6ICdpcy1jaGVja2VkJyxcbiAgICBJU19VUEdSQURFRDogJ2lzLXVwZ3JhZGVkJ1xufTtcbi8qKlxuICAgKiBIYW5kbGUgY2hhbmdlIG9mIHN0YXRlLlxuICAgKlxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudCBUaGUgZXZlbnQgdGhhdCBmaXJlZC5cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbENoZWNrYm94LnByb3RvdHlwZS5vbkNoYW5nZV8gPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB0aGlzLnVwZGF0ZUNsYXNzZXNfKCk7XG59O1xuLyoqXG4gICAqIEhhbmRsZSBmb2N1cyBvZiBlbGVtZW50LlxuICAgKlxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudCBUaGUgZXZlbnQgdGhhdCBmaXJlZC5cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbENoZWNrYm94LnByb3RvdHlwZS5vbkZvY3VzXyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLklTX0ZPQ1VTRUQpO1xufTtcbi8qKlxuICAgKiBIYW5kbGUgbG9zdCBmb2N1cyBvZiBlbGVtZW50LlxuICAgKlxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudCBUaGUgZXZlbnQgdGhhdCBmaXJlZC5cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbENoZWNrYm94LnByb3RvdHlwZS5vbkJsdXJfID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfRk9DVVNFRCk7XG59O1xuLyoqXG4gICAqIEhhbmRsZSBtb3VzZXVwLlxuICAgKlxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudCBUaGUgZXZlbnQgdGhhdCBmaXJlZC5cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbENoZWNrYm94LnByb3RvdHlwZS5vbk1vdXNlVXBfID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdGhpcy5ibHVyXygpO1xufTtcbi8qKlxuICAgKiBIYW5kbGUgY2xhc3MgdXBkYXRlcy5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbENoZWNrYm94LnByb3RvdHlwZS51cGRhdGVDbGFzc2VzXyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmNoZWNrRGlzYWJsZWQoKTtcbiAgICB0aGlzLmNoZWNrVG9nZ2xlU3RhdGUoKTtcbn07XG4vKipcbiAgICogQWRkIGJsdXIuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxDaGVja2JveC5wcm90b3R5cGUuYmx1cl8gPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gVE9ETzogZmlndXJlIG91dCB3aHkgdGhlcmUncyBhIGZvY3VzIGV2ZW50IGJlaW5nIGZpcmVkIGFmdGVyIG91ciBibHVyLFxuICAgIC8vIHNvIHRoYXQgd2UgY2FuIGF2b2lkIHRoaXMgaGFjay5cbiAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuaW5wdXRFbGVtZW50Xy5ibHVyKCk7XG4gICAgfS5iaW5kKHRoaXMpLCB0aGlzLkNvbnN0YW50Xy5USU5ZX1RJTUVPVVQpO1xufTtcbi8vIFB1YmxpYyBtZXRob2RzLlxuLyoqXG4gICAqIENoZWNrIHRoZSBpbnB1dHMgdG9nZ2xlIHN0YXRlIGFuZCB1cGRhdGUgZGlzcGxheS5cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKi9cbk1hdGVyaWFsQ2hlY2tib3gucHJvdG90eXBlLmNoZWNrVG9nZ2xlU3RhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuaW5wdXRFbGVtZW50Xy5jaGVja2VkKSB7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLklTX0NIRUNLRUQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LnJlbW92ZSh0aGlzLkNzc0NsYXNzZXNfLklTX0NIRUNLRUQpO1xuICAgIH1cbn07XG5NYXRlcmlhbENoZWNrYm94LnByb3RvdHlwZVsnY2hlY2tUb2dnbGVTdGF0ZSddID0gTWF0ZXJpYWxDaGVja2JveC5wcm90b3R5cGUuY2hlY2tUb2dnbGVTdGF0ZTtcbi8qKlxuICAgKiBDaGVjayB0aGUgaW5wdXRzIGRpc2FibGVkIHN0YXRlIGFuZCB1cGRhdGUgZGlzcGxheS5cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKi9cbk1hdGVyaWFsQ2hlY2tib3gucHJvdG90eXBlLmNoZWNrRGlzYWJsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuaW5wdXRFbGVtZW50Xy5kaXNhYmxlZCkge1xuICAgICAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JU19ESVNBQkxFRCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfRElTQUJMRUQpO1xuICAgIH1cbn07XG5NYXRlcmlhbENoZWNrYm94LnByb3RvdHlwZVsnY2hlY2tEaXNhYmxlZCddID0gTWF0ZXJpYWxDaGVja2JveC5wcm90b3R5cGUuY2hlY2tEaXNhYmxlZDtcbi8qKlxuICAgKiBEaXNhYmxlIGNoZWNrYm94LlxuICAgKlxuICAgKiBAcHVibGljXG4gICAqL1xuTWF0ZXJpYWxDaGVja2JveC5wcm90b3R5cGUuZGlzYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmlucHV0RWxlbWVudF8uZGlzYWJsZWQgPSB0cnVlO1xuICAgIHRoaXMudXBkYXRlQ2xhc3Nlc18oKTtcbn07XG5NYXRlcmlhbENoZWNrYm94LnByb3RvdHlwZVsnZGlzYWJsZSddID0gTWF0ZXJpYWxDaGVja2JveC5wcm90b3R5cGUuZGlzYWJsZTtcbi8qKlxuICAgKiBFbmFibGUgY2hlY2tib3guXG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICovXG5NYXRlcmlhbENoZWNrYm94LnByb3RvdHlwZS5lbmFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5pbnB1dEVsZW1lbnRfLmRpc2FibGVkID0gZmFsc2U7XG4gICAgdGhpcy51cGRhdGVDbGFzc2VzXygpO1xufTtcbk1hdGVyaWFsQ2hlY2tib3gucHJvdG90eXBlWydlbmFibGUnXSA9IE1hdGVyaWFsQ2hlY2tib3gucHJvdG90eXBlLmVuYWJsZTtcbi8qKlxuICAgKiBDaGVjayBjaGVja2JveC5cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKi9cbk1hdGVyaWFsQ2hlY2tib3gucHJvdG90eXBlLmNoZWNrID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuaW5wdXRFbGVtZW50Xy5jaGVja2VkID0gdHJ1ZTtcbiAgICB0aGlzLnVwZGF0ZUNsYXNzZXNfKCk7XG59O1xuTWF0ZXJpYWxDaGVja2JveC5wcm90b3R5cGVbJ2NoZWNrJ10gPSBNYXRlcmlhbENoZWNrYm94LnByb3RvdHlwZS5jaGVjaztcbi8qKlxuICAgKiBVbmNoZWNrIGNoZWNrYm94LlxuICAgKlxuICAgKiBAcHVibGljXG4gICAqL1xuTWF0ZXJpYWxDaGVja2JveC5wcm90b3R5cGUudW5jaGVjayA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmlucHV0RWxlbWVudF8uY2hlY2tlZCA9IGZhbHNlO1xuICAgIHRoaXMudXBkYXRlQ2xhc3Nlc18oKTtcbn07XG5NYXRlcmlhbENoZWNrYm94LnByb3RvdHlwZVsndW5jaGVjayddID0gTWF0ZXJpYWxDaGVja2JveC5wcm90b3R5cGUudW5jaGVjaztcbi8qKlxuICAgKiBJbml0aWFsaXplIGVsZW1lbnQuXG4gICAqL1xuTWF0ZXJpYWxDaGVja2JveC5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5lbGVtZW50Xykge1xuICAgICAgICB0aGlzLmlucHV0RWxlbWVudF8gPSB0aGlzLmVsZW1lbnRfLnF1ZXJ5U2VsZWN0b3IoJy4nICsgdGhpcy5Dc3NDbGFzc2VzXy5JTlBVVCk7XG4gICAgICAgIHZhciBib3hPdXRsaW5lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICBib3hPdXRsaW5lLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5CT1hfT1VUTElORSk7XG4gICAgICAgIHZhciB0aWNrQ29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICB0aWNrQ29udGFpbmVyLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5GT0NVU19IRUxQRVIpO1xuICAgICAgICB2YXIgdGlja091dGxpbmUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgIHRpY2tPdXRsaW5lLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5USUNLX09VVExJTkUpO1xuICAgICAgICBib3hPdXRsaW5lLmFwcGVuZENoaWxkKHRpY2tPdXRsaW5lKTtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5hcHBlbmRDaGlsZCh0aWNrQ29udGFpbmVyKTtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5hcHBlbmRDaGlsZChib3hPdXRsaW5lKTtcbiAgICAgICAgaWYgKHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uUklQUExFX0VGRkVDVCkpIHtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLlJJUFBMRV9JR05PUkVfRVZFTlRTKTtcbiAgICAgICAgICAgIHRoaXMucmlwcGxlQ29udGFpbmVyRWxlbWVudF8gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICB0aGlzLnJpcHBsZUNvbnRhaW5lckVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5SSVBQTEVfQ09OVEFJTkVSKTtcbiAgICAgICAgICAgIHRoaXMucmlwcGxlQ29udGFpbmVyRWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLlJJUFBMRV9FRkZFQ1QpO1xuICAgICAgICAgICAgdGhpcy5yaXBwbGVDb250YWluZXJFbGVtZW50Xy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uUklQUExFX0NFTlRFUik7XG4gICAgICAgICAgICB0aGlzLmJvdW5kUmlwcGxlTW91c2VVcCA9IHRoaXMub25Nb3VzZVVwXy5iaW5kKHRoaXMpO1xuICAgICAgICAgICAgdGhpcy5yaXBwbGVDb250YWluZXJFbGVtZW50Xy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5ib3VuZFJpcHBsZU1vdXNlVXApO1xuICAgICAgICAgICAgdmFyIHJpcHBsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgIHJpcHBsZS5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uUklQUExFKTtcbiAgICAgICAgICAgIHRoaXMucmlwcGxlQ29udGFpbmVyRWxlbWVudF8uYXBwZW5kQ2hpbGQocmlwcGxlKTtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudF8uYXBwZW5kQ2hpbGQodGhpcy5yaXBwbGVDb250YWluZXJFbGVtZW50Xyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5ib3VuZElucHV0T25DaGFuZ2UgPSB0aGlzLm9uQ2hhbmdlXy5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmJvdW5kSW5wdXRPbkZvY3VzID0gdGhpcy5vbkZvY3VzXy5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmJvdW5kSW5wdXRPbkJsdXIgPSB0aGlzLm9uQmx1cl8uYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5ib3VuZEVsZW1lbnRNb3VzZVVwID0gdGhpcy5vbk1vdXNlVXBfLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuaW5wdXRFbGVtZW50Xy5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCB0aGlzLmJvdW5kSW5wdXRPbkNoYW5nZSk7XG4gICAgICAgIHRoaXMuaW5wdXRFbGVtZW50Xy5hZGRFdmVudExpc3RlbmVyKCdmb2N1cycsIHRoaXMuYm91bmRJbnB1dE9uRm9jdXMpO1xuICAgICAgICB0aGlzLmlucHV0RWxlbWVudF8uYWRkRXZlbnRMaXN0ZW5lcignYmx1cicsIHRoaXMuYm91bmRJbnB1dE9uQmx1cik7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuYm91bmRFbGVtZW50TW91c2VVcCk7XG4gICAgICAgIHRoaXMudXBkYXRlQ2xhc3Nlc18oKTtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfVVBHUkFERUQpO1xuICAgIH1cbn07XG4vLyBUaGUgY29tcG9uZW50IHJlZ2lzdGVycyBpdHNlbGYuIEl0IGNhbiBhc3N1bWUgY29tcG9uZW50SGFuZGxlciBpcyBhdmFpbGFibGVcbi8vIGluIHRoZSBnbG9iYWwgc2NvcGUuXG5jb21wb25lbnRIYW5kbGVyLnJlZ2lzdGVyKHtcbiAgICBjb25zdHJ1Y3RvcjogTWF0ZXJpYWxDaGVja2JveCxcbiAgICBjbGFzc0FzU3RyaW5nOiAnTWF0ZXJpYWxDaGVja2JveCcsXG4gICAgY3NzQ2xhc3M6ICdtZGwtanMtY2hlY2tib3gnLFxuICAgIHdpZGdldDogdHJ1ZVxufSk7XG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNSBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICAgKiBDbGFzcyBjb25zdHJ1Y3RvciBmb3IgaWNvbiB0b2dnbGUgTURMIGNvbXBvbmVudC5cbiAgICogSW1wbGVtZW50cyBNREwgY29tcG9uZW50IGRlc2lnbiBwYXR0ZXJuIGRlZmluZWQgYXQ6XG4gICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9qYXNvbm1heWVzL21kbC1jb21wb25lbnQtZGVzaWduLXBhdHRlcm5cbiAgICpcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsZW1lbnQgVGhlIGVsZW1lbnQgdGhhdCB3aWxsIGJlIHVwZ3JhZGVkLlxuICAgKi9cbnZhciBNYXRlcmlhbEljb25Ub2dnbGUgPSBmdW5jdGlvbiBNYXRlcmlhbEljb25Ub2dnbGUoZWxlbWVudCkge1xuICAgIHRoaXMuZWxlbWVudF8gPSBlbGVtZW50O1xuICAgIC8vIEluaXRpYWxpemUgaW5zdGFuY2UuXG4gICAgdGhpcy5pbml0KCk7XG59O1xud2luZG93WydNYXRlcmlhbEljb25Ub2dnbGUnXSA9IE1hdGVyaWFsSWNvblRvZ2dsZTtcbi8qKlxuICAgKiBTdG9yZSBjb25zdGFudHMgaW4gb25lIHBsYWNlIHNvIHRoZXkgY2FuIGJlIHVwZGF0ZWQgZWFzaWx5LlxuICAgKlxuICAgKiBAZW51bSB7c3RyaW5nIHwgbnVtYmVyfVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsSWNvblRvZ2dsZS5wcm90b3R5cGUuQ29uc3RhbnRfID0geyBUSU5ZX1RJTUVPVVQ6IDAuMDAxIH07XG4vKipcbiAgICogU3RvcmUgc3RyaW5ncyBmb3IgY2xhc3MgbmFtZXMgZGVmaW5lZCBieSB0aGlzIGNvbXBvbmVudCB0aGF0IGFyZSB1c2VkIGluXG4gICAqIEphdmFTY3JpcHQuIFRoaXMgYWxsb3dzIHVzIHRvIHNpbXBseSBjaGFuZ2UgaXQgaW4gb25lIHBsYWNlIHNob3VsZCB3ZVxuICAgKiBkZWNpZGUgdG8gbW9kaWZ5IGF0IGEgbGF0ZXIgZGF0ZS5cbiAgICpcbiAgICogQGVudW0ge3N0cmluZ31cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbEljb25Ub2dnbGUucHJvdG90eXBlLkNzc0NsYXNzZXNfID0ge1xuICAgIElOUFVUOiAnbWRsLWljb24tdG9nZ2xlX19pbnB1dCcsXG4gICAgSlNfUklQUExFX0VGRkVDVDogJ21kbC1qcy1yaXBwbGUtZWZmZWN0JyxcbiAgICBSSVBQTEVfSUdOT1JFX0VWRU5UUzogJ21kbC1qcy1yaXBwbGUtZWZmZWN0LS1pZ25vcmUtZXZlbnRzJyxcbiAgICBSSVBQTEVfQ09OVEFJTkVSOiAnbWRsLWljb24tdG9nZ2xlX19yaXBwbGUtY29udGFpbmVyJyxcbiAgICBSSVBQTEVfQ0VOVEVSOiAnbWRsLXJpcHBsZS0tY2VudGVyJyxcbiAgICBSSVBQTEU6ICdtZGwtcmlwcGxlJyxcbiAgICBJU19GT0NVU0VEOiAnaXMtZm9jdXNlZCcsXG4gICAgSVNfRElTQUJMRUQ6ICdpcy1kaXNhYmxlZCcsXG4gICAgSVNfQ0hFQ0tFRDogJ2lzLWNoZWNrZWQnXG59O1xuLyoqXG4gICAqIEhhbmRsZSBjaGFuZ2Ugb2Ygc3RhdGUuXG4gICAqXG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IFRoZSBldmVudCB0aGF0IGZpcmVkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsSWNvblRvZ2dsZS5wcm90b3R5cGUub25DaGFuZ2VfID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdGhpcy51cGRhdGVDbGFzc2VzXygpO1xufTtcbi8qKlxuICAgKiBIYW5kbGUgZm9jdXMgb2YgZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnQgVGhlIGV2ZW50IHRoYXQgZmlyZWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxJY29uVG9nZ2xlLnByb3RvdHlwZS5vbkZvY3VzXyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLklTX0ZPQ1VTRUQpO1xufTtcbi8qKlxuICAgKiBIYW5kbGUgbG9zdCBmb2N1cyBvZiBlbGVtZW50LlxuICAgKlxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudCBUaGUgZXZlbnQgdGhhdCBmaXJlZC5cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbEljb25Ub2dnbGUucHJvdG90eXBlLm9uQmx1cl8gPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5yZW1vdmUodGhpcy5Dc3NDbGFzc2VzXy5JU19GT0NVU0VEKTtcbn07XG4vKipcbiAgICogSGFuZGxlIG1vdXNldXAuXG4gICAqXG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IFRoZSBldmVudCB0aGF0IGZpcmVkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsSWNvblRvZ2dsZS5wcm90b3R5cGUub25Nb3VzZVVwXyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHRoaXMuYmx1cl8oKTtcbn07XG4vKipcbiAgICogSGFuZGxlIGNsYXNzIHVwZGF0ZXMuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxJY29uVG9nZ2xlLnByb3RvdHlwZS51cGRhdGVDbGFzc2VzXyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmNoZWNrRGlzYWJsZWQoKTtcbiAgICB0aGlzLmNoZWNrVG9nZ2xlU3RhdGUoKTtcbn07XG4vKipcbiAgICogQWRkIGJsdXIuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxJY29uVG9nZ2xlLnByb3RvdHlwZS5ibHVyXyA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBUT0RPOiBmaWd1cmUgb3V0IHdoeSB0aGVyZSdzIGEgZm9jdXMgZXZlbnQgYmVpbmcgZmlyZWQgYWZ0ZXIgb3VyIGJsdXIsXG4gICAgLy8gc28gdGhhdCB3ZSBjYW4gYXZvaWQgdGhpcyBoYWNrLlxuICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5pbnB1dEVsZW1lbnRfLmJsdXIoKTtcbiAgICB9LmJpbmQodGhpcyksIHRoaXMuQ29uc3RhbnRfLlRJTllfVElNRU9VVCk7XG59O1xuLy8gUHVibGljIG1ldGhvZHMuXG4vKipcbiAgICogQ2hlY2sgdGhlIGlucHV0cyB0b2dnbGUgc3RhdGUgYW5kIHVwZGF0ZSBkaXNwbGF5LlxuICAgKlxuICAgKiBAcHVibGljXG4gICAqL1xuTWF0ZXJpYWxJY29uVG9nZ2xlLnByb3RvdHlwZS5jaGVja1RvZ2dsZVN0YXRlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmlucHV0RWxlbWVudF8uY2hlY2tlZCkge1xuICAgICAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JU19DSEVDS0VEKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5yZW1vdmUodGhpcy5Dc3NDbGFzc2VzXy5JU19DSEVDS0VEKTtcbiAgICB9XG59O1xuTWF0ZXJpYWxJY29uVG9nZ2xlLnByb3RvdHlwZVsnY2hlY2tUb2dnbGVTdGF0ZSddID0gTWF0ZXJpYWxJY29uVG9nZ2xlLnByb3RvdHlwZS5jaGVja1RvZ2dsZVN0YXRlO1xuLyoqXG4gICAqIENoZWNrIHRoZSBpbnB1dHMgZGlzYWJsZWQgc3RhdGUgYW5kIHVwZGF0ZSBkaXNwbGF5LlxuICAgKlxuICAgKiBAcHVibGljXG4gICAqL1xuTWF0ZXJpYWxJY29uVG9nZ2xlLnByb3RvdHlwZS5jaGVja0Rpc2FibGVkID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmlucHV0RWxlbWVudF8uZGlzYWJsZWQpIHtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfRElTQUJMRUQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LnJlbW92ZSh0aGlzLkNzc0NsYXNzZXNfLklTX0RJU0FCTEVEKTtcbiAgICB9XG59O1xuTWF0ZXJpYWxJY29uVG9nZ2xlLnByb3RvdHlwZVsnY2hlY2tEaXNhYmxlZCddID0gTWF0ZXJpYWxJY29uVG9nZ2xlLnByb3RvdHlwZS5jaGVja0Rpc2FibGVkO1xuLyoqXG4gICAqIERpc2FibGUgaWNvbiB0b2dnbGUuXG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICovXG5NYXRlcmlhbEljb25Ub2dnbGUucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5pbnB1dEVsZW1lbnRfLmRpc2FibGVkID0gdHJ1ZTtcbiAgICB0aGlzLnVwZGF0ZUNsYXNzZXNfKCk7XG59O1xuTWF0ZXJpYWxJY29uVG9nZ2xlLnByb3RvdHlwZVsnZGlzYWJsZSddID0gTWF0ZXJpYWxJY29uVG9nZ2xlLnByb3RvdHlwZS5kaXNhYmxlO1xuLyoqXG4gICAqIEVuYWJsZSBpY29uIHRvZ2dsZS5cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKi9cbk1hdGVyaWFsSWNvblRvZ2dsZS5wcm90b3R5cGUuZW5hYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuaW5wdXRFbGVtZW50Xy5kaXNhYmxlZCA9IGZhbHNlO1xuICAgIHRoaXMudXBkYXRlQ2xhc3Nlc18oKTtcbn07XG5NYXRlcmlhbEljb25Ub2dnbGUucHJvdG90eXBlWydlbmFibGUnXSA9IE1hdGVyaWFsSWNvblRvZ2dsZS5wcm90b3R5cGUuZW5hYmxlO1xuLyoqXG4gICAqIENoZWNrIGljb24gdG9nZ2xlLlxuICAgKlxuICAgKiBAcHVibGljXG4gICAqL1xuTWF0ZXJpYWxJY29uVG9nZ2xlLnByb3RvdHlwZS5jaGVjayA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmlucHV0RWxlbWVudF8uY2hlY2tlZCA9IHRydWU7XG4gICAgdGhpcy51cGRhdGVDbGFzc2VzXygpO1xufTtcbk1hdGVyaWFsSWNvblRvZ2dsZS5wcm90b3R5cGVbJ2NoZWNrJ10gPSBNYXRlcmlhbEljb25Ub2dnbGUucHJvdG90eXBlLmNoZWNrO1xuLyoqXG4gICAqIFVuY2hlY2sgaWNvbiB0b2dnbGUuXG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICovXG5NYXRlcmlhbEljb25Ub2dnbGUucHJvdG90eXBlLnVuY2hlY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5pbnB1dEVsZW1lbnRfLmNoZWNrZWQgPSBmYWxzZTtcbiAgICB0aGlzLnVwZGF0ZUNsYXNzZXNfKCk7XG59O1xuTWF0ZXJpYWxJY29uVG9nZ2xlLnByb3RvdHlwZVsndW5jaGVjayddID0gTWF0ZXJpYWxJY29uVG9nZ2xlLnByb3RvdHlwZS51bmNoZWNrO1xuLyoqXG4gICAqIEluaXRpYWxpemUgZWxlbWVudC5cbiAgICovXG5NYXRlcmlhbEljb25Ub2dnbGUucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuZWxlbWVudF8pIHtcbiAgICAgICAgdGhpcy5pbnB1dEVsZW1lbnRfID0gdGhpcy5lbGVtZW50Xy5xdWVyeVNlbGVjdG9yKCcuJyArIHRoaXMuQ3NzQ2xhc3Nlc18uSU5QVVQpO1xuICAgICAgICBpZiAodGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5KU19SSVBQTEVfRUZGRUNUKSkge1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uUklQUExFX0lHTk9SRV9FVkVOVFMpO1xuICAgICAgICAgICAgdGhpcy5yaXBwbGVDb250YWluZXJFbGVtZW50XyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgIHRoaXMucmlwcGxlQ29udGFpbmVyRWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLlJJUFBMRV9DT05UQUlORVIpO1xuICAgICAgICAgICAgdGhpcy5yaXBwbGVDb250YWluZXJFbGVtZW50Xy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uSlNfUklQUExFX0VGRkVDVCk7XG4gICAgICAgICAgICB0aGlzLnJpcHBsZUNvbnRhaW5lckVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5SSVBQTEVfQ0VOVEVSKTtcbiAgICAgICAgICAgIHRoaXMuYm91bmRSaXBwbGVNb3VzZVVwID0gdGhpcy5vbk1vdXNlVXBfLmJpbmQodGhpcyk7XG4gICAgICAgICAgICB0aGlzLnJpcHBsZUNvbnRhaW5lckVsZW1lbnRfLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCB0aGlzLmJvdW5kUmlwcGxlTW91c2VVcCk7XG4gICAgICAgICAgICB2YXIgcmlwcGxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgcmlwcGxlLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5SSVBQTEUpO1xuICAgICAgICAgICAgdGhpcy5yaXBwbGVDb250YWluZXJFbGVtZW50Xy5hcHBlbmRDaGlsZChyaXBwbGUpO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50Xy5hcHBlbmRDaGlsZCh0aGlzLnJpcHBsZUNvbnRhaW5lckVsZW1lbnRfKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmJvdW5kSW5wdXRPbkNoYW5nZSA9IHRoaXMub25DaGFuZ2VfLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuYm91bmRJbnB1dE9uRm9jdXMgPSB0aGlzLm9uRm9jdXNfLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuYm91bmRJbnB1dE9uQmx1ciA9IHRoaXMub25CbHVyXy5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmJvdW5kRWxlbWVudE9uTW91c2VVcCA9IHRoaXMub25Nb3VzZVVwXy5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmlucHV0RWxlbWVudF8uYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgdGhpcy5ib3VuZElucHV0T25DaGFuZ2UpO1xuICAgICAgICB0aGlzLmlucHV0RWxlbWVudF8uYWRkRXZlbnRMaXN0ZW5lcignZm9jdXMnLCB0aGlzLmJvdW5kSW5wdXRPbkZvY3VzKTtcbiAgICAgICAgdGhpcy5pbnB1dEVsZW1lbnRfLmFkZEV2ZW50TGlzdGVuZXIoJ2JsdXInLCB0aGlzLmJvdW5kSW5wdXRPbkJsdXIpO1xuICAgICAgICB0aGlzLmVsZW1lbnRfLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCB0aGlzLmJvdW5kRWxlbWVudE9uTW91c2VVcCk7XG4gICAgICAgIHRoaXMudXBkYXRlQ2xhc3Nlc18oKTtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuYWRkKCdpcy11cGdyYWRlZCcpO1xuICAgIH1cbn07XG4vLyBUaGUgY29tcG9uZW50IHJlZ2lzdGVycyBpdHNlbGYuIEl0IGNhbiBhc3N1bWUgY29tcG9uZW50SGFuZGxlciBpcyBhdmFpbGFibGVcbi8vIGluIHRoZSBnbG9iYWwgc2NvcGUuXG5jb21wb25lbnRIYW5kbGVyLnJlZ2lzdGVyKHtcbiAgICBjb25zdHJ1Y3RvcjogTWF0ZXJpYWxJY29uVG9nZ2xlLFxuICAgIGNsYXNzQXNTdHJpbmc6ICdNYXRlcmlhbEljb25Ub2dnbGUnLFxuICAgIGNzc0NsYXNzOiAnbWRsLWpzLWljb24tdG9nZ2xlJyxcbiAgICB3aWRnZXQ6IHRydWVcbn0pO1xuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTUgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAgICogQ2xhc3MgY29uc3RydWN0b3IgZm9yIGRyb3Bkb3duIE1ETCBjb21wb25lbnQuXG4gICAqIEltcGxlbWVudHMgTURMIGNvbXBvbmVudCBkZXNpZ24gcGF0dGVybiBkZWZpbmVkIGF0OlxuICAgKiBodHRwczovL2dpdGh1Yi5jb20vamFzb25tYXllcy9tZGwtY29tcG9uZW50LWRlc2lnbi1wYXR0ZXJuXG4gICAqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbGVtZW50IFRoZSBlbGVtZW50IHRoYXQgd2lsbCBiZSB1cGdyYWRlZC5cbiAgICovXG52YXIgTWF0ZXJpYWxNZW51ID0gZnVuY3Rpb24gTWF0ZXJpYWxNZW51KGVsZW1lbnQpIHtcbiAgICB0aGlzLmVsZW1lbnRfID0gZWxlbWVudDtcbiAgICAvLyBJbml0aWFsaXplIGluc3RhbmNlLlxuICAgIHRoaXMuaW5pdCgpO1xufTtcbndpbmRvd1snTWF0ZXJpYWxNZW51J10gPSBNYXRlcmlhbE1lbnU7XG4vKipcbiAgICogU3RvcmUgY29uc3RhbnRzIGluIG9uZSBwbGFjZSBzbyB0aGV5IGNhbiBiZSB1cGRhdGVkIGVhc2lseS5cbiAgICpcbiAgICogQGVudW0ge3N0cmluZyB8IG51bWJlcn1cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbE1lbnUucHJvdG90eXBlLkNvbnN0YW50XyA9IHtcbiAgICAvLyBUb3RhbCBkdXJhdGlvbiBvZiB0aGUgbWVudSBhbmltYXRpb24uXG4gICAgVFJBTlNJVElPTl9EVVJBVElPTl9TRUNPTkRTOiAwLjMsXG4gICAgLy8gVGhlIGZyYWN0aW9uIG9mIHRoZSB0b3RhbCBkdXJhdGlvbiB3ZSB3YW50IHRvIHVzZSBmb3IgbWVudSBpdGVtIGFuaW1hdGlvbnMuXG4gICAgVFJBTlNJVElPTl9EVVJBVElPTl9GUkFDVElPTjogMC44LFxuICAgIC8vIEhvdyBsb25nIHRoZSBtZW51IHN0YXlzIG9wZW4gYWZ0ZXIgY2hvb3NpbmcgYW4gb3B0aW9uIChzbyB0aGUgdXNlciBjYW4gc2VlXG4gICAgLy8gdGhlIHJpcHBsZSkuXG4gICAgQ0xPU0VfVElNRU9VVDogMTUwXG59O1xuLyoqXG4gICAqIEtleWNvZGVzLCBmb3IgY29kZSByZWFkYWJpbGl0eS5cbiAgICpcbiAgICogQGVudW0ge251bWJlcn1cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbE1lbnUucHJvdG90eXBlLktleWNvZGVzXyA9IHtcbiAgICBFTlRFUjogMTMsXG4gICAgRVNDQVBFOiAyNyxcbiAgICBTUEFDRTogMzIsXG4gICAgVVBfQVJST1c6IDM4LFxuICAgIERPV05fQVJST1c6IDQwXG59O1xuLyoqXG4gICAqIFN0b3JlIHN0cmluZ3MgZm9yIGNsYXNzIG5hbWVzIGRlZmluZWQgYnkgdGhpcyBjb21wb25lbnQgdGhhdCBhcmUgdXNlZCBpblxuICAgKiBKYXZhU2NyaXB0LiBUaGlzIGFsbG93cyB1cyB0byBzaW1wbHkgY2hhbmdlIGl0IGluIG9uZSBwbGFjZSBzaG91bGQgd2VcbiAgICogZGVjaWRlIHRvIG1vZGlmeSBhdCBhIGxhdGVyIGRhdGUuXG4gICAqXG4gICAqIEBlbnVtIHtzdHJpbmd9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxNZW51LnByb3RvdHlwZS5Dc3NDbGFzc2VzXyA9IHtcbiAgICBDT05UQUlORVI6ICdtZGwtbWVudV9fY29udGFpbmVyJyxcbiAgICBPVVRMSU5FOiAnbWRsLW1lbnVfX291dGxpbmUnLFxuICAgIElURU06ICdtZGwtbWVudV9faXRlbScsXG4gICAgSVRFTV9SSVBQTEVfQ09OVEFJTkVSOiAnbWRsLW1lbnVfX2l0ZW0tcmlwcGxlLWNvbnRhaW5lcicsXG4gICAgUklQUExFX0VGRkVDVDogJ21kbC1qcy1yaXBwbGUtZWZmZWN0JyxcbiAgICBSSVBQTEVfSUdOT1JFX0VWRU5UUzogJ21kbC1qcy1yaXBwbGUtZWZmZWN0LS1pZ25vcmUtZXZlbnRzJyxcbiAgICBSSVBQTEU6ICdtZGwtcmlwcGxlJyxcbiAgICAvLyBTdGF0dXNlc1xuICAgIElTX1VQR1JBREVEOiAnaXMtdXBncmFkZWQnLFxuICAgIElTX1ZJU0lCTEU6ICdpcy12aXNpYmxlJyxcbiAgICBJU19BTklNQVRJTkc6ICdpcy1hbmltYXRpbmcnLFxuICAgIC8vIEFsaWdubWVudCBvcHRpb25zXG4gICAgQk9UVE9NX0xFRlQ6ICdtZGwtbWVudS0tYm90dG9tLWxlZnQnLFxuICAgIC8vIFRoaXMgaXMgdGhlIGRlZmF1bHQuXG4gICAgQk9UVE9NX1JJR0hUOiAnbWRsLW1lbnUtLWJvdHRvbS1yaWdodCcsXG4gICAgVE9QX0xFRlQ6ICdtZGwtbWVudS0tdG9wLWxlZnQnLFxuICAgIFRPUF9SSUdIVDogJ21kbC1tZW51LS10b3AtcmlnaHQnLFxuICAgIFVOQUxJR05FRDogJ21kbC1tZW51LS11bmFsaWduZWQnXG59O1xuLyoqXG4gICAqIEluaXRpYWxpemUgZWxlbWVudC5cbiAgICovXG5NYXRlcmlhbE1lbnUucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuZWxlbWVudF8pIHtcbiAgICAgICAgLy8gQ3JlYXRlIGNvbnRhaW5lciBmb3IgdGhlIG1lbnUuXG4gICAgICAgIHZhciBjb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgY29udGFpbmVyLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5DT05UQUlORVIpO1xuICAgICAgICB0aGlzLmVsZW1lbnRfLnBhcmVudEVsZW1lbnQuaW5zZXJ0QmVmb3JlKGNvbnRhaW5lciwgdGhpcy5lbGVtZW50Xyk7XG4gICAgICAgIHRoaXMuZWxlbWVudF8ucGFyZW50RWxlbWVudC5yZW1vdmVDaGlsZCh0aGlzLmVsZW1lbnRfKTtcbiAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHRoaXMuZWxlbWVudF8pO1xuICAgICAgICB0aGlzLmNvbnRhaW5lcl8gPSBjb250YWluZXI7XG4gICAgICAgIC8vIENyZWF0ZSBvdXRsaW5lIGZvciB0aGUgbWVudSAoc2hhZG93IGFuZCBiYWNrZ3JvdW5kKS5cbiAgICAgICAgdmFyIG91dGxpbmUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgb3V0bGluZS5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uT1VUTElORSk7XG4gICAgICAgIHRoaXMub3V0bGluZV8gPSBvdXRsaW5lO1xuICAgICAgICBjb250YWluZXIuaW5zZXJ0QmVmb3JlKG91dGxpbmUsIHRoaXMuZWxlbWVudF8pO1xuICAgICAgICAvLyBGaW5kIHRoZSBcImZvclwiIGVsZW1lbnQgYW5kIGJpbmQgZXZlbnRzIHRvIGl0LlxuICAgICAgICB2YXIgZm9yRWxJZCA9IHRoaXMuZWxlbWVudF8uZ2V0QXR0cmlidXRlKCdmb3InKSB8fCB0aGlzLmVsZW1lbnRfLmdldEF0dHJpYnV0ZSgnZGF0YS1tZGwtZm9yJyk7XG4gICAgICAgIHZhciBmb3JFbCA9IG51bGw7XG4gICAgICAgIGlmIChmb3JFbElkKSB7XG4gICAgICAgICAgICBmb3JFbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGZvckVsSWQpO1xuICAgICAgICAgICAgaWYgKGZvckVsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5mb3JFbGVtZW50XyA9IGZvckVsO1xuICAgICAgICAgICAgICAgIGZvckVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5oYW5kbGVGb3JDbGlja18uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICAgICAgZm9yRWwuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIHRoaXMuaGFuZGxlRm9yS2V5Ym9hcmRFdmVudF8uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGl0ZW1zID0gdGhpcy5lbGVtZW50Xy5xdWVyeVNlbGVjdG9yQWxsKCcuJyArIHRoaXMuQ3NzQ2xhc3Nlc18uSVRFTSk7XG4gICAgICAgIHRoaXMuYm91bmRJdGVtS2V5ZG93bl8gPSB0aGlzLmhhbmRsZUl0ZW1LZXlib2FyZEV2ZW50Xy5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmJvdW5kSXRlbUNsaWNrXyA9IHRoaXMuaGFuZGxlSXRlbUNsaWNrXy5iaW5kKHRoaXMpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGl0ZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAvLyBBZGQgYSBsaXN0ZW5lciB0byBlYWNoIG1lbnUgaXRlbS5cbiAgICAgICAgICAgIGl0ZW1zW2ldLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5ib3VuZEl0ZW1DbGlja18pO1xuICAgICAgICAgICAgLy8gQWRkIGEgdGFiIGluZGV4IHRvIGVhY2ggbWVudSBpdGVtLlxuICAgICAgICAgICAgaXRlbXNbaV0udGFiSW5kZXggPSAnLTEnO1xuICAgICAgICAgICAgLy8gQWRkIGEga2V5Ym9hcmQgbGlzdGVuZXIgdG8gZWFjaCBtZW51IGl0ZW0uXG4gICAgICAgICAgICBpdGVtc1tpXS5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgdGhpcy5ib3VuZEl0ZW1LZXlkb3duXyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gQWRkIHJpcHBsZSBjbGFzc2VzIHRvIGVhY2ggaXRlbSwgaWYgdGhlIHVzZXIgaGFzIGVuYWJsZWQgcmlwcGxlcy5cbiAgICAgICAgaWYgKHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uUklQUExFX0VGRkVDVCkpIHtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLlJJUFBMRV9JR05PUkVfRVZFTlRTKTtcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBpdGVtID0gaXRlbXNbaV07XG4gICAgICAgICAgICAgICAgdmFyIHJpcHBsZUNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgICAgICByaXBwbGVDb250YWluZXIuY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLklURU1fUklQUExFX0NPTlRBSU5FUik7XG4gICAgICAgICAgICAgICAgdmFyIHJpcHBsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgICAgICByaXBwbGUuY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLlJJUFBMRSk7XG4gICAgICAgICAgICAgICAgcmlwcGxlQ29udGFpbmVyLmFwcGVuZENoaWxkKHJpcHBsZSk7XG4gICAgICAgICAgICAgICAgaXRlbS5hcHBlbmRDaGlsZChyaXBwbGVDb250YWluZXIpO1xuICAgICAgICAgICAgICAgIGl0ZW0uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLlJJUFBMRV9FRkZFQ1QpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIENvcHkgYWxpZ25tZW50IGNsYXNzZXMgdG8gdGhlIGNvbnRhaW5lciwgc28gdGhlIG91dGxpbmUgY2FuIHVzZSB0aGVtLlxuICAgICAgICBpZiAodGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5CT1RUT01fTEVGVCkpIHtcbiAgICAgICAgICAgIHRoaXMub3V0bGluZV8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLkJPVFRPTV9MRUZUKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5CT1RUT01fUklHSFQpKSB7XG4gICAgICAgICAgICB0aGlzLm91dGxpbmVfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5CT1RUT01fUklHSFQpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLlRPUF9MRUZUKSkge1xuICAgICAgICAgICAgdGhpcy5vdXRsaW5lXy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uVE9QX0xFRlQpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLlRPUF9SSUdIVCkpIHtcbiAgICAgICAgICAgIHRoaXMub3V0bGluZV8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLlRPUF9SSUdIVCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uVU5BTElHTkVEKSkge1xuICAgICAgICAgICAgdGhpcy5vdXRsaW5lXy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uVU5BTElHTkVEKTtcbiAgICAgICAgfVxuICAgICAgICBjb250YWluZXIuY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLklTX1VQR1JBREVEKTtcbiAgICB9XG59O1xuLyoqXG4gICAqIEhhbmRsZXMgYSBjbGljayBvbiB0aGUgXCJmb3JcIiBlbGVtZW50LCBieSBwb3NpdGlvbmluZyB0aGUgbWVudSBhbmQgdGhlblxuICAgKiB0b2dnbGluZyBpdC5cbiAgICpcbiAgICogQHBhcmFtIHtFdmVudH0gZXZ0IFRoZSBldmVudCB0aGF0IGZpcmVkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsTWVudS5wcm90b3R5cGUuaGFuZGxlRm9yQ2xpY2tfID0gZnVuY3Rpb24gKGV2dCkge1xuICAgIGlmICh0aGlzLmVsZW1lbnRfICYmIHRoaXMuZm9yRWxlbWVudF8pIHtcbiAgICAgICAgdmFyIHJlY3QgPSB0aGlzLmZvckVsZW1lbnRfLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICB2YXIgZm9yUmVjdCA9IHRoaXMuZm9yRWxlbWVudF8ucGFyZW50RWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgaWYgKHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uVU5BTElHTkVEKSkge1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uQk9UVE9NX1JJR0hUKSkge1xuICAgICAgICAgICAgLy8gUG9zaXRpb24gYmVsb3cgdGhlIFwiZm9yXCIgZWxlbWVudCwgYWxpZ25lZCB0byBpdHMgcmlnaHQuXG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lcl8uc3R5bGUucmlnaHQgPSBmb3JSZWN0LnJpZ2h0IC0gcmVjdC5yaWdodCArICdweCc7XG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lcl8uc3R5bGUudG9wID0gdGhpcy5mb3JFbGVtZW50Xy5vZmZzZXRUb3AgKyB0aGlzLmZvckVsZW1lbnRfLm9mZnNldEhlaWdodCArICdweCc7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5UT1BfTEVGVCkpIHtcbiAgICAgICAgICAgIC8vIFBvc2l0aW9uIGFib3ZlIHRoZSBcImZvclwiIGVsZW1lbnQsIGFsaWduZWQgdG8gaXRzIGxlZnQuXG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lcl8uc3R5bGUubGVmdCA9IHRoaXMuZm9yRWxlbWVudF8ub2Zmc2V0TGVmdCArICdweCc7XG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lcl8uc3R5bGUuYm90dG9tID0gZm9yUmVjdC5ib3R0b20gLSByZWN0LnRvcCArICdweCc7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5UT1BfUklHSFQpKSB7XG4gICAgICAgICAgICAvLyBQb3NpdGlvbiBhYm92ZSB0aGUgXCJmb3JcIiBlbGVtZW50LCBhbGlnbmVkIHRvIGl0cyByaWdodC5cbiAgICAgICAgICAgIHRoaXMuY29udGFpbmVyXy5zdHlsZS5yaWdodCA9IGZvclJlY3QucmlnaHQgLSByZWN0LnJpZ2h0ICsgJ3B4JztcbiAgICAgICAgICAgIHRoaXMuY29udGFpbmVyXy5zdHlsZS5ib3R0b20gPSBmb3JSZWN0LmJvdHRvbSAtIHJlY3QudG9wICsgJ3B4JztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIERlZmF1bHQ6IHBvc2l0aW9uIGJlbG93IHRoZSBcImZvclwiIGVsZW1lbnQsIGFsaWduZWQgdG8gaXRzIGxlZnQuXG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lcl8uc3R5bGUubGVmdCA9IHRoaXMuZm9yRWxlbWVudF8ub2Zmc2V0TGVmdCArICdweCc7XG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lcl8uc3R5bGUudG9wID0gdGhpcy5mb3JFbGVtZW50Xy5vZmZzZXRUb3AgKyB0aGlzLmZvckVsZW1lbnRfLm9mZnNldEhlaWdodCArICdweCc7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdGhpcy50b2dnbGUoZXZ0KTtcbn07XG4vKipcbiAgICogSGFuZGxlcyBhIGtleWJvYXJkIGV2ZW50IG9uIHRoZSBcImZvclwiIGVsZW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2dCBUaGUgZXZlbnQgdGhhdCBmaXJlZC5cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbE1lbnUucHJvdG90eXBlLmhhbmRsZUZvcktleWJvYXJkRXZlbnRfID0gZnVuY3Rpb24gKGV2dCkge1xuICAgIGlmICh0aGlzLmVsZW1lbnRfICYmIHRoaXMuY29udGFpbmVyXyAmJiB0aGlzLmZvckVsZW1lbnRfKSB7XG4gICAgICAgIHZhciBpdGVtcyA9IHRoaXMuZWxlbWVudF8ucXVlcnlTZWxlY3RvckFsbCgnLicgKyB0aGlzLkNzc0NsYXNzZXNfLklURU0gKyAnOm5vdChbZGlzYWJsZWRdKScpO1xuICAgICAgICBpZiAoaXRlbXMgJiYgaXRlbXMubGVuZ3RoID4gMCAmJiB0aGlzLmNvbnRhaW5lcl8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfVklTSUJMRSkpIHtcbiAgICAgICAgICAgIGlmIChldnQua2V5Q29kZSA9PT0gdGhpcy5LZXljb2Rlc18uVVBfQVJST1cpIHtcbiAgICAgICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBpdGVtc1tpdGVtcy5sZW5ndGggLSAxXS5mb2N1cygpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChldnQua2V5Q29kZSA9PT0gdGhpcy5LZXljb2Rlc18uRE9XTl9BUlJPVykge1xuICAgICAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGl0ZW1zWzBdLmZvY3VzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuLyoqXG4gICAqIEhhbmRsZXMgYSBrZXlib2FyZCBldmVudCBvbiBhbiBpdGVtLlxuICAgKlxuICAgKiBAcGFyYW0ge0V2ZW50fSBldnQgVGhlIGV2ZW50IHRoYXQgZmlyZWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxNZW51LnByb3RvdHlwZS5oYW5kbGVJdGVtS2V5Ym9hcmRFdmVudF8gPSBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgaWYgKHRoaXMuZWxlbWVudF8gJiYgdGhpcy5jb250YWluZXJfKSB7XG4gICAgICAgIHZhciBpdGVtcyA9IHRoaXMuZWxlbWVudF8ucXVlcnlTZWxlY3RvckFsbCgnLicgKyB0aGlzLkNzc0NsYXNzZXNfLklURU0gKyAnOm5vdChbZGlzYWJsZWRdKScpO1xuICAgICAgICBpZiAoaXRlbXMgJiYgaXRlbXMubGVuZ3RoID4gMCAmJiB0aGlzLmNvbnRhaW5lcl8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfVklTSUJMRSkpIHtcbiAgICAgICAgICAgIHZhciBjdXJyZW50SW5kZXggPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChpdGVtcykuaW5kZXhPZihldnQudGFyZ2V0KTtcbiAgICAgICAgICAgIGlmIChldnQua2V5Q29kZSA9PT0gdGhpcy5LZXljb2Rlc18uVVBfQVJST1cpIHtcbiAgICAgICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudEluZGV4ID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBpdGVtc1tjdXJyZW50SW5kZXggLSAxXS5mb2N1cygpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zW2l0ZW1zLmxlbmd0aCAtIDFdLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChldnQua2V5Q29kZSA9PT0gdGhpcy5LZXljb2Rlc18uRE9XTl9BUlJPVykge1xuICAgICAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGlmIChpdGVtcy5sZW5ndGggPiBjdXJyZW50SW5kZXggKyAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zW2N1cnJlbnRJbmRleCArIDFdLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbXNbMF0uZm9jdXMoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGV2dC5rZXlDb2RlID09PSB0aGlzLktleWNvZGVzXy5TUEFDRSB8fCBldnQua2V5Q29kZSA9PT0gdGhpcy5LZXljb2Rlc18uRU5URVIpIHtcbiAgICAgICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAvLyBTZW5kIG1vdXNlZG93biBhbmQgbW91c2V1cCB0byB0cmlnZ2VyIHJpcHBsZS5cbiAgICAgICAgICAgICAgICB2YXIgZSA9IG5ldyBNb3VzZUV2ZW50KCdtb3VzZWRvd24nKTtcbiAgICAgICAgICAgICAgICBldnQudGFyZ2V0LmRpc3BhdGNoRXZlbnQoZSk7XG4gICAgICAgICAgICAgICAgZSA9IG5ldyBNb3VzZUV2ZW50KCdtb3VzZXVwJyk7XG4gICAgICAgICAgICAgICAgZXZ0LnRhcmdldC5kaXNwYXRjaEV2ZW50KGUpO1xuICAgICAgICAgICAgICAgIC8vIFNlbmQgY2xpY2suXG4gICAgICAgICAgICAgICAgZXZ0LnRhcmdldC5jbGljaygpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChldnQua2V5Q29kZSA9PT0gdGhpcy5LZXljb2Rlc18uRVNDQVBFKSB7XG4gICAgICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuLyoqXG4gICAqIEhhbmRsZXMgYSBjbGljayBldmVudCBvbiBhbiBpdGVtLlxuICAgKlxuICAgKiBAcGFyYW0ge0V2ZW50fSBldnQgVGhlIGV2ZW50IHRoYXQgZmlyZWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxNZW51LnByb3RvdHlwZS5oYW5kbGVJdGVtQ2xpY2tfID0gZnVuY3Rpb24gKGV2dCkge1xuICAgIGlmIChldnQudGFyZ2V0Lmhhc0F0dHJpYnV0ZSgnZGlzYWJsZWQnKSkge1xuICAgICAgICBldnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gV2FpdCBzb21lIHRpbWUgYmVmb3JlIGNsb3NpbmcgbWVudSwgc28gdGhlIHVzZXIgY2FuIHNlZSB0aGUgcmlwcGxlLlxuICAgICAgICB0aGlzLmNsb3NpbmdfID0gdHJ1ZTtcbiAgICAgICAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICAgICAgdGhpcy5oaWRlKCk7XG4gICAgICAgICAgICB0aGlzLmNsb3NpbmdfID0gZmFsc2U7XG4gICAgICAgIH0uYmluZCh0aGlzKSwgdGhpcy5Db25zdGFudF8uQ0xPU0VfVElNRU9VVCk7XG4gICAgfVxufTtcbi8qKlxuICAgKiBDYWxjdWxhdGVzIHRoZSBpbml0aWFsIGNsaXAgKGZvciBvcGVuaW5nIHRoZSBtZW51KSBvciBmaW5hbCBjbGlwIChmb3IgY2xvc2luZ1xuICAgKiBpdCksIGFuZCBhcHBsaWVzIGl0LiBUaGlzIGFsbG93cyB1cyB0byBhbmltYXRlIGZyb20gb3IgdG8gdGhlIGNvcnJlY3QgcG9pbnQsXG4gICAqIHRoYXQgaXMsIHRoZSBwb2ludCBpdCdzIGFsaWduZWQgdG8gaW4gdGhlIFwiZm9yXCIgZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtudW1iZXJ9IGhlaWdodCBIZWlnaHQgb2YgdGhlIGNsaXAgcmVjdGFuZ2xlXG4gICAqIEBwYXJhbSB7bnVtYmVyfSB3aWR0aCBXaWR0aCBvZiB0aGUgY2xpcCByZWN0YW5nbGVcbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbE1lbnUucHJvdG90eXBlLmFwcGx5Q2xpcF8gPSBmdW5jdGlvbiAoaGVpZ2h0LCB3aWR0aCkge1xuICAgIGlmICh0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLlVOQUxJR05FRCkpIHtcbiAgICAgICAgLy8gRG8gbm90IGNsaXAuXG4gICAgICAgIHRoaXMuZWxlbWVudF8uc3R5bGUuY2xpcCA9ICcnO1xuICAgIH0gZWxzZSBpZiAodGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5CT1RUT01fUklHSFQpKSB7XG4gICAgICAgIC8vIENsaXAgdG8gdGhlIHRvcCByaWdodCBjb3JuZXIgb2YgdGhlIG1lbnUuXG4gICAgICAgIHRoaXMuZWxlbWVudF8uc3R5bGUuY2xpcCA9ICdyZWN0KDAgJyArIHdpZHRoICsgJ3B4ICcgKyAnMCAnICsgd2lkdGggKyAncHgpJztcbiAgICB9IGVsc2UgaWYgKHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uVE9QX0xFRlQpKSB7XG4gICAgICAgIC8vIENsaXAgdG8gdGhlIGJvdHRvbSBsZWZ0IGNvcm5lciBvZiB0aGUgbWVudS5cbiAgICAgICAgdGhpcy5lbGVtZW50Xy5zdHlsZS5jbGlwID0gJ3JlY3QoJyArIGhlaWdodCArICdweCAwICcgKyBoZWlnaHQgKyAncHggMCknO1xuICAgIH0gZWxzZSBpZiAodGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5UT1BfUklHSFQpKSB7XG4gICAgICAgIC8vIENsaXAgdG8gdGhlIGJvdHRvbSByaWdodCBjb3JuZXIgb2YgdGhlIG1lbnUuXG4gICAgICAgIHRoaXMuZWxlbWVudF8uc3R5bGUuY2xpcCA9ICdyZWN0KCcgKyBoZWlnaHQgKyAncHggJyArIHdpZHRoICsgJ3B4ICcgKyBoZWlnaHQgKyAncHggJyArIHdpZHRoICsgJ3B4KSc7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRGVmYXVsdDogZG8gbm90IGNsaXAgKHNhbWUgYXMgY2xpcHBpbmcgdG8gdGhlIHRvcCBsZWZ0IGNvcm5lcikuXG4gICAgICAgIHRoaXMuZWxlbWVudF8uc3R5bGUuY2xpcCA9ICcnO1xuICAgIH1cbn07XG4vKipcbiAgICogQ2xlYW51cCBmdW5jdGlvbiB0byByZW1vdmUgYW5pbWF0aW9uIGxpc3RlbmVycy5cbiAgICpcbiAgICogQHBhcmFtIHtFdmVudH0gZXZ0XG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxNZW51LnByb3RvdHlwZS5yZW1vdmVBbmltYXRpb25FbmRMaXN0ZW5lcl8gPSBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgZXZ0LnRhcmdldC5jbGFzc0xpc3QucmVtb3ZlKE1hdGVyaWFsTWVudS5wcm90b3R5cGUuQ3NzQ2xhc3Nlc18uSVNfQU5JTUFUSU5HKTtcbn07XG4vKipcbiAgICogQWRkcyBhbiBldmVudCBsaXN0ZW5lciB0byBjbGVhbiB1cCBhZnRlciB0aGUgYW5pbWF0aW9uIGVuZHMuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxNZW51LnByb3RvdHlwZS5hZGRBbmltYXRpb25FbmRMaXN0ZW5lcl8gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5lbGVtZW50Xy5hZGRFdmVudExpc3RlbmVyKCd0cmFuc2l0aW9uZW5kJywgdGhpcy5yZW1vdmVBbmltYXRpb25FbmRMaXN0ZW5lcl8pO1xuICAgIHRoaXMuZWxlbWVudF8uYWRkRXZlbnRMaXN0ZW5lcignd2Via2l0VHJhbnNpdGlvbkVuZCcsIHRoaXMucmVtb3ZlQW5pbWF0aW9uRW5kTGlzdGVuZXJfKTtcbn07XG4vKipcbiAgICogRGlzcGxheXMgdGhlIG1lbnUuXG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICovXG5NYXRlcmlhbE1lbnUucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgaWYgKHRoaXMuZWxlbWVudF8gJiYgdGhpcy5jb250YWluZXJfICYmIHRoaXMub3V0bGluZV8pIHtcbiAgICAgICAgLy8gTWVhc3VyZSB0aGUgaW5uZXIgZWxlbWVudC5cbiAgICAgICAgdmFyIGhlaWdodCA9IHRoaXMuZWxlbWVudF8uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xuICAgICAgICB2YXIgd2lkdGggPSB0aGlzLmVsZW1lbnRfLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLndpZHRoO1xuICAgICAgICAvLyBBcHBseSB0aGUgaW5uZXIgZWxlbWVudCdzIHNpemUgdG8gdGhlIGNvbnRhaW5lciBhbmQgb3V0bGluZS5cbiAgICAgICAgdGhpcy5jb250YWluZXJfLnN0eWxlLndpZHRoID0gd2lkdGggKyAncHgnO1xuICAgICAgICB0aGlzLmNvbnRhaW5lcl8uc3R5bGUuaGVpZ2h0ID0gaGVpZ2h0ICsgJ3B4JztcbiAgICAgICAgdGhpcy5vdXRsaW5lXy5zdHlsZS53aWR0aCA9IHdpZHRoICsgJ3B4JztcbiAgICAgICAgdGhpcy5vdXRsaW5lXy5zdHlsZS5oZWlnaHQgPSBoZWlnaHQgKyAncHgnO1xuICAgICAgICB2YXIgdHJhbnNpdGlvbkR1cmF0aW9uID0gdGhpcy5Db25zdGFudF8uVFJBTlNJVElPTl9EVVJBVElPTl9TRUNPTkRTICogdGhpcy5Db25zdGFudF8uVFJBTlNJVElPTl9EVVJBVElPTl9GUkFDVElPTjtcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHRyYW5zaXRpb24gZGVsYXlzIGZvciBpbmRpdmlkdWFsIG1lbnUgaXRlbXMsIHNvIHRoYXQgdGhleSBmYWRlXG4gICAgICAgIC8vIGluIG9uZSBhdCBhIHRpbWUuXG4gICAgICAgIHZhciBpdGVtcyA9IHRoaXMuZWxlbWVudF8ucXVlcnlTZWxlY3RvckFsbCgnLicgKyB0aGlzLkNzc0NsYXNzZXNfLklURU0pO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGl0ZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgaXRlbURlbGF5ID0gbnVsbDtcbiAgICAgICAgICAgIGlmICh0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLlRPUF9MRUZUKSB8fCB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLlRPUF9SSUdIVCkpIHtcbiAgICAgICAgICAgICAgICBpdGVtRGVsYXkgPSAoaGVpZ2h0IC0gaXRlbXNbaV0ub2Zmc2V0VG9wIC0gaXRlbXNbaV0ub2Zmc2V0SGVpZ2h0KSAvIGhlaWdodCAqIHRyYW5zaXRpb25EdXJhdGlvbiArICdzJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaXRlbURlbGF5ID0gaXRlbXNbaV0ub2Zmc2V0VG9wIC8gaGVpZ2h0ICogdHJhbnNpdGlvbkR1cmF0aW9uICsgJ3MnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaXRlbXNbaV0uc3R5bGUudHJhbnNpdGlvbkRlbGF5ID0gaXRlbURlbGF5O1xuICAgICAgICB9XG4gICAgICAgIC8vIEFwcGx5IHRoZSBpbml0aWFsIGNsaXAgdG8gdGhlIHRleHQgYmVmb3JlIHdlIHN0YXJ0IGFuaW1hdGluZy5cbiAgICAgICAgdGhpcy5hcHBseUNsaXBfKGhlaWdodCwgd2lkdGgpO1xuICAgICAgICAvLyBXYWl0IGZvciB0aGUgbmV4dCBmcmFtZSwgdHVybiBvbiBhbmltYXRpb24sIGFuZCBhcHBseSB0aGUgZmluYWwgY2xpcC5cbiAgICAgICAgLy8gQWxzbyBtYWtlIGl0IHZpc2libGUuIFRoaXMgdHJpZ2dlcnMgdGhlIHRyYW5zaXRpb25zLlxuICAgICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLklTX0FOSU1BVElORyk7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRfLnN0eWxlLmNsaXAgPSAncmVjdCgwICcgKyB3aWR0aCArICdweCAnICsgaGVpZ2h0ICsgJ3B4IDApJztcbiAgICAgICAgICAgIHRoaXMuY29udGFpbmVyXy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfVklTSUJMRSk7XG4gICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgIC8vIENsZWFuIHVwIGFmdGVyIHRoZSBhbmltYXRpb24gaXMgY29tcGxldGUuXG4gICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uRW5kTGlzdGVuZXJfKCk7XG4gICAgICAgIC8vIEFkZCBhIGNsaWNrIGxpc3RlbmVyIHRvIHRoZSBkb2N1bWVudCwgdG8gY2xvc2UgdGhlIG1lbnUuXG4gICAgICAgIHZhciBjYWxsYmFjayA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAvLyBDaGVjayB0byBzZWUgaWYgdGhlIGRvY3VtZW50IGlzIHByb2Nlc3NpbmcgdGhlIHNhbWUgZXZlbnQgdGhhdFxuICAgICAgICAgICAgLy8gZGlzcGxheWVkIHRoZSBtZW51IGluIHRoZSBmaXJzdCBwbGFjZS4gSWYgc28sIGRvIG5vdGhpbmcuXG4gICAgICAgICAgICAvLyBBbHNvIGNoZWNrIHRvIHNlZSBpZiB0aGUgbWVudSBpcyBpbiB0aGUgcHJvY2VzcyBvZiBjbG9zaW5nIGl0c2VsZiwgYW5kXG4gICAgICAgICAgICAvLyBkbyBub3RoaW5nIGluIHRoYXQgY2FzZS5cbiAgICAgICAgICAgIC8vIEFsc28gY2hlY2sgaWYgdGhlIGNsaWNrZWQgZWxlbWVudCBpcyBhIG1lbnUgaXRlbVxuICAgICAgICAgICAgLy8gaWYgc28sIGRvIG5vdGhpbmcuXG4gICAgICAgICAgICBpZiAoZSAhPT0gZXZ0ICYmICF0aGlzLmNsb3NpbmdfICYmIGUudGFyZ2V0LnBhcmVudE5vZGUgIT09IHRoaXMuZWxlbWVudF8pIHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfS5iaW5kKHRoaXMpO1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGNhbGxiYWNrKTtcbiAgICB9XG59O1xuTWF0ZXJpYWxNZW51LnByb3RvdHlwZVsnc2hvdyddID0gTWF0ZXJpYWxNZW51LnByb3RvdHlwZS5zaG93O1xuLyoqXG4gICAqIEhpZGVzIHRoZSBtZW51LlxuICAgKlxuICAgKiBAcHVibGljXG4gICAqL1xuTWF0ZXJpYWxNZW51LnByb3RvdHlwZS5oaWRlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmVsZW1lbnRfICYmIHRoaXMuY29udGFpbmVyXyAmJiB0aGlzLm91dGxpbmVfKSB7XG4gICAgICAgIHZhciBpdGVtcyA9IHRoaXMuZWxlbWVudF8ucXVlcnlTZWxlY3RvckFsbCgnLicgKyB0aGlzLkNzc0NsYXNzZXNfLklURU0pO1xuICAgICAgICAvLyBSZW1vdmUgYWxsIHRyYW5zaXRpb24gZGVsYXlzOyBtZW51IGl0ZW1zIGZhZGUgb3V0IGNvbmN1cnJlbnRseS5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaXRlbXNbaV0uc3R5bGUucmVtb3ZlUHJvcGVydHkoJ3RyYW5zaXRpb24tZGVsYXknKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBNZWFzdXJlIHRoZSBpbm5lciBlbGVtZW50LlxuICAgICAgICB2YXIgcmVjdCA9IHRoaXMuZWxlbWVudF8uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIHZhciBoZWlnaHQgPSByZWN0LmhlaWdodDtcbiAgICAgICAgdmFyIHdpZHRoID0gcmVjdC53aWR0aDtcbiAgICAgICAgLy8gVHVybiBvbiBhbmltYXRpb24sIGFuZCBhcHBseSB0aGUgZmluYWwgY2xpcC4gQWxzbyBtYWtlIGludmlzaWJsZS5cbiAgICAgICAgLy8gVGhpcyB0cmlnZ2VycyB0aGUgdHJhbnNpdGlvbnMuXG4gICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLklTX0FOSU1BVElORyk7XG4gICAgICAgIHRoaXMuYXBwbHlDbGlwXyhoZWlnaHQsIHdpZHRoKTtcbiAgICAgICAgdGhpcy5jb250YWluZXJfLmNsYXNzTGlzdC5yZW1vdmUodGhpcy5Dc3NDbGFzc2VzXy5JU19WSVNJQkxFKTtcbiAgICAgICAgLy8gQ2xlYW4gdXAgYWZ0ZXIgdGhlIGFuaW1hdGlvbiBpcyBjb21wbGV0ZS5cbiAgICAgICAgdGhpcy5hZGRBbmltYXRpb25FbmRMaXN0ZW5lcl8oKTtcbiAgICB9XG59O1xuTWF0ZXJpYWxNZW51LnByb3RvdHlwZVsnaGlkZSddID0gTWF0ZXJpYWxNZW51LnByb3RvdHlwZS5oaWRlO1xuLyoqXG4gICAqIERpc3BsYXlzIG9yIGhpZGVzIHRoZSBtZW51LCBkZXBlbmRpbmcgb24gY3VycmVudCBzdGF0ZS5cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKi9cbk1hdGVyaWFsTWVudS5wcm90b3R5cGUudG9nZ2xlID0gZnVuY3Rpb24gKGV2dCkge1xuICAgIGlmICh0aGlzLmNvbnRhaW5lcl8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfVklTSUJMRSkpIHtcbiAgICAgICAgdGhpcy5oaWRlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5zaG93KGV2dCk7XG4gICAgfVxufTtcbk1hdGVyaWFsTWVudS5wcm90b3R5cGVbJ3RvZ2dsZSddID0gTWF0ZXJpYWxNZW51LnByb3RvdHlwZS50b2dnbGU7XG4vLyBUaGUgY29tcG9uZW50IHJlZ2lzdGVycyBpdHNlbGYuIEl0IGNhbiBhc3N1bWUgY29tcG9uZW50SGFuZGxlciBpcyBhdmFpbGFibGVcbi8vIGluIHRoZSBnbG9iYWwgc2NvcGUuXG5jb21wb25lbnRIYW5kbGVyLnJlZ2lzdGVyKHtcbiAgICBjb25zdHJ1Y3RvcjogTWF0ZXJpYWxNZW51LFxuICAgIGNsYXNzQXNTdHJpbmc6ICdNYXRlcmlhbE1lbnUnLFxuICAgIGNzc0NsYXNzOiAnbWRsLWpzLW1lbnUnLFxuICAgIHdpZGdldDogdHJ1ZVxufSk7XG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNSBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICAgKiBDbGFzcyBjb25zdHJ1Y3RvciBmb3IgUHJvZ3Jlc3MgTURMIGNvbXBvbmVudC5cbiAgICogSW1wbGVtZW50cyBNREwgY29tcG9uZW50IGRlc2lnbiBwYXR0ZXJuIGRlZmluZWQgYXQ6XG4gICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9qYXNvbm1heWVzL21kbC1jb21wb25lbnQtZGVzaWduLXBhdHRlcm5cbiAgICpcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsZW1lbnQgVGhlIGVsZW1lbnQgdGhhdCB3aWxsIGJlIHVwZ3JhZGVkLlxuICAgKi9cbnZhciBNYXRlcmlhbFByb2dyZXNzID0gZnVuY3Rpb24gTWF0ZXJpYWxQcm9ncmVzcyhlbGVtZW50KSB7XG4gICAgdGhpcy5lbGVtZW50XyA9IGVsZW1lbnQ7XG4gICAgLy8gSW5pdGlhbGl6ZSBpbnN0YW5jZS5cbiAgICB0aGlzLmluaXQoKTtcbn07XG53aW5kb3dbJ01hdGVyaWFsUHJvZ3Jlc3MnXSA9IE1hdGVyaWFsUHJvZ3Jlc3M7XG4vKipcbiAgICogU3RvcmUgY29uc3RhbnRzIGluIG9uZSBwbGFjZSBzbyB0aGV5IGNhbiBiZSB1cGRhdGVkIGVhc2lseS5cbiAgICpcbiAgICogQGVudW0ge3N0cmluZyB8IG51bWJlcn1cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFByb2dyZXNzLnByb3RvdHlwZS5Db25zdGFudF8gPSB7fTtcbi8qKlxuICAgKiBTdG9yZSBzdHJpbmdzIGZvciBjbGFzcyBuYW1lcyBkZWZpbmVkIGJ5IHRoaXMgY29tcG9uZW50IHRoYXQgYXJlIHVzZWQgaW5cbiAgICogSmF2YVNjcmlwdC4gVGhpcyBhbGxvd3MgdXMgdG8gc2ltcGx5IGNoYW5nZSBpdCBpbiBvbmUgcGxhY2Ugc2hvdWxkIHdlXG4gICAqIGRlY2lkZSB0byBtb2RpZnkgYXQgYSBsYXRlciBkYXRlLlxuICAgKlxuICAgKiBAZW51bSB7c3RyaW5nfVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsUHJvZ3Jlc3MucHJvdG90eXBlLkNzc0NsYXNzZXNfID0geyBJTkRFVEVSTUlOQVRFX0NMQVNTOiAnbWRsLXByb2dyZXNzX19pbmRldGVybWluYXRlJyB9O1xuLyoqXG4gICAqIFNldCB0aGUgY3VycmVudCBwcm9ncmVzcyBvZiB0aGUgcHJvZ3Jlc3NiYXIuXG4gICAqXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBwIFBlcmNlbnRhZ2Ugb2YgdGhlIHByb2dyZXNzICgwLTEwMClcbiAgICogQHB1YmxpY1xuICAgKi9cbk1hdGVyaWFsUHJvZ3Jlc3MucHJvdG90eXBlLnNldFByb2dyZXNzID0gZnVuY3Rpb24gKHApIHtcbiAgICBpZiAodGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5JTkRFVEVSTUlOQVRFX0NMQVNTKSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMucHJvZ3Jlc3NiYXJfLnN0eWxlLndpZHRoID0gcCArICclJztcbn07XG5NYXRlcmlhbFByb2dyZXNzLnByb3RvdHlwZVsnc2V0UHJvZ3Jlc3MnXSA9IE1hdGVyaWFsUHJvZ3Jlc3MucHJvdG90eXBlLnNldFByb2dyZXNzO1xuLyoqXG4gICAqIFNldCB0aGUgY3VycmVudCBwcm9ncmVzcyBvZiB0aGUgYnVmZmVyLlxuICAgKlxuICAgKiBAcGFyYW0ge251bWJlcn0gcCBQZXJjZW50YWdlIG9mIHRoZSBidWZmZXIgKDAtMTAwKVxuICAgKiBAcHVibGljXG4gICAqL1xuTWF0ZXJpYWxQcm9ncmVzcy5wcm90b3R5cGUuc2V0QnVmZmVyID0gZnVuY3Rpb24gKHApIHtcbiAgICB0aGlzLmJ1ZmZlcmJhcl8uc3R5bGUud2lkdGggPSBwICsgJyUnO1xuICAgIHRoaXMuYXV4YmFyXy5zdHlsZS53aWR0aCA9IDEwMCAtIHAgKyAnJSc7XG59O1xuTWF0ZXJpYWxQcm9ncmVzcy5wcm90b3R5cGVbJ3NldEJ1ZmZlciddID0gTWF0ZXJpYWxQcm9ncmVzcy5wcm90b3R5cGUuc2V0QnVmZmVyO1xuLyoqXG4gICAqIEluaXRpYWxpemUgZWxlbWVudC5cbiAgICovXG5NYXRlcmlhbFByb2dyZXNzLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmVsZW1lbnRfKSB7XG4gICAgICAgIHZhciBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICBlbC5jbGFzc05hbWUgPSAncHJvZ3Jlc3NiYXIgYmFyIGJhcjEnO1xuICAgICAgICB0aGlzLmVsZW1lbnRfLmFwcGVuZENoaWxkKGVsKTtcbiAgICAgICAgdGhpcy5wcm9ncmVzc2Jhcl8gPSBlbDtcbiAgICAgICAgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgZWwuY2xhc3NOYW1lID0gJ2J1ZmZlcmJhciBiYXIgYmFyMic7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uYXBwZW5kQ2hpbGQoZWwpO1xuICAgICAgICB0aGlzLmJ1ZmZlcmJhcl8gPSBlbDtcbiAgICAgICAgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgZWwuY2xhc3NOYW1lID0gJ2F1eGJhciBiYXIgYmFyMyc7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uYXBwZW5kQ2hpbGQoZWwpO1xuICAgICAgICB0aGlzLmF1eGJhcl8gPSBlbDtcbiAgICAgICAgdGhpcy5wcm9ncmVzc2Jhcl8uc3R5bGUud2lkdGggPSAnMCUnO1xuICAgICAgICB0aGlzLmJ1ZmZlcmJhcl8uc3R5bGUud2lkdGggPSAnMTAwJSc7XG4gICAgICAgIHRoaXMuYXV4YmFyXy5zdHlsZS53aWR0aCA9ICcwJSc7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmFkZCgnaXMtdXBncmFkZWQnKTtcbiAgICB9XG59O1xuLy8gVGhlIGNvbXBvbmVudCByZWdpc3RlcnMgaXRzZWxmLiBJdCBjYW4gYXNzdW1lIGNvbXBvbmVudEhhbmRsZXIgaXMgYXZhaWxhYmxlXG4vLyBpbiB0aGUgZ2xvYmFsIHNjb3BlLlxuY29tcG9uZW50SGFuZGxlci5yZWdpc3Rlcih7XG4gICAgY29uc3RydWN0b3I6IE1hdGVyaWFsUHJvZ3Jlc3MsXG4gICAgY2xhc3NBc1N0cmluZzogJ01hdGVyaWFsUHJvZ3Jlc3MnLFxuICAgIGNzc0NsYXNzOiAnbWRsLWpzLXByb2dyZXNzJyxcbiAgICB3aWRnZXQ6IHRydWVcbn0pO1xuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTUgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAgICogQ2xhc3MgY29uc3RydWN0b3IgZm9yIFJhZGlvIE1ETCBjb21wb25lbnQuXG4gICAqIEltcGxlbWVudHMgTURMIGNvbXBvbmVudCBkZXNpZ24gcGF0dGVybiBkZWZpbmVkIGF0OlxuICAgKiBodHRwczovL2dpdGh1Yi5jb20vamFzb25tYXllcy9tZGwtY29tcG9uZW50LWRlc2lnbi1wYXR0ZXJuXG4gICAqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbGVtZW50IFRoZSBlbGVtZW50IHRoYXQgd2lsbCBiZSB1cGdyYWRlZC5cbiAgICovXG52YXIgTWF0ZXJpYWxSYWRpbyA9IGZ1bmN0aW9uIE1hdGVyaWFsUmFkaW8oZWxlbWVudCkge1xuICAgIHRoaXMuZWxlbWVudF8gPSBlbGVtZW50O1xuICAgIC8vIEluaXRpYWxpemUgaW5zdGFuY2UuXG4gICAgdGhpcy5pbml0KCk7XG59O1xud2luZG93WydNYXRlcmlhbFJhZGlvJ10gPSBNYXRlcmlhbFJhZGlvO1xuLyoqXG4gICAqIFN0b3JlIGNvbnN0YW50cyBpbiBvbmUgcGxhY2Ugc28gdGhleSBjYW4gYmUgdXBkYXRlZCBlYXNpbHkuXG4gICAqXG4gICAqIEBlbnVtIHtzdHJpbmcgfCBudW1iZXJ9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxSYWRpby5wcm90b3R5cGUuQ29uc3RhbnRfID0geyBUSU5ZX1RJTUVPVVQ6IDAuMDAxIH07XG4vKipcbiAgICogU3RvcmUgc3RyaW5ncyBmb3IgY2xhc3MgbmFtZXMgZGVmaW5lZCBieSB0aGlzIGNvbXBvbmVudCB0aGF0IGFyZSB1c2VkIGluXG4gICAqIEphdmFTY3JpcHQuIFRoaXMgYWxsb3dzIHVzIHRvIHNpbXBseSBjaGFuZ2UgaXQgaW4gb25lIHBsYWNlIHNob3VsZCB3ZVxuICAgKiBkZWNpZGUgdG8gbW9kaWZ5IGF0IGEgbGF0ZXIgZGF0ZS5cbiAgICpcbiAgICogQGVudW0ge3N0cmluZ31cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFJhZGlvLnByb3RvdHlwZS5Dc3NDbGFzc2VzXyA9IHtcbiAgICBJU19GT0NVU0VEOiAnaXMtZm9jdXNlZCcsXG4gICAgSVNfRElTQUJMRUQ6ICdpcy1kaXNhYmxlZCcsXG4gICAgSVNfQ0hFQ0tFRDogJ2lzLWNoZWNrZWQnLFxuICAgIElTX1VQR1JBREVEOiAnaXMtdXBncmFkZWQnLFxuICAgIEpTX1JBRElPOiAnbWRsLWpzLXJhZGlvJyxcbiAgICBSQURJT19CVE46ICdtZGwtcmFkaW9fX2J1dHRvbicsXG4gICAgUkFESU9fT1VURVJfQ0lSQ0xFOiAnbWRsLXJhZGlvX19vdXRlci1jaXJjbGUnLFxuICAgIFJBRElPX0lOTkVSX0NJUkNMRTogJ21kbC1yYWRpb19faW5uZXItY2lyY2xlJyxcbiAgICBSSVBQTEVfRUZGRUNUOiAnbWRsLWpzLXJpcHBsZS1lZmZlY3QnLFxuICAgIFJJUFBMRV9JR05PUkVfRVZFTlRTOiAnbWRsLWpzLXJpcHBsZS1lZmZlY3QtLWlnbm9yZS1ldmVudHMnLFxuICAgIFJJUFBMRV9DT05UQUlORVI6ICdtZGwtcmFkaW9fX3JpcHBsZS1jb250YWluZXInLFxuICAgIFJJUFBMRV9DRU5URVI6ICdtZGwtcmlwcGxlLS1jZW50ZXInLFxuICAgIFJJUFBMRTogJ21kbC1yaXBwbGUnXG59O1xuLyoqXG4gICAqIEhhbmRsZSBjaGFuZ2Ugb2Ygc3RhdGUuXG4gICAqXG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IFRoZSBldmVudCB0aGF0IGZpcmVkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsUmFkaW8ucHJvdG90eXBlLm9uQ2hhbmdlXyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIC8vIFNpbmNlIG90aGVyIHJhZGlvIGJ1dHRvbnMgZG9uJ3QgZ2V0IGNoYW5nZSBldmVudHMsIHdlIG5lZWQgdG8gbG9vayBmb3JcbiAgICAvLyB0aGVtIHRvIHVwZGF0ZSB0aGVpciBjbGFzc2VzLlxuICAgIHZhciByYWRpb3MgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKHRoaXMuQ3NzQ2xhc3Nlc18uSlNfUkFESU8pO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmFkaW9zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBidXR0b24gPSByYWRpb3NbaV0ucXVlcnlTZWxlY3RvcignLicgKyB0aGlzLkNzc0NsYXNzZXNfLlJBRElPX0JUTik7XG4gICAgICAgIC8vIERpZmZlcmVudCBuYW1lID09IGRpZmZlcmVudCBncm91cCwgc28gbm8gcG9pbnQgdXBkYXRpbmcgdGhvc2UuXG4gICAgICAgIGlmIChidXR0b24uZ2V0QXR0cmlidXRlKCduYW1lJykgPT09IHRoaXMuYnRuRWxlbWVudF8uZ2V0QXR0cmlidXRlKCduYW1lJykpIHtcbiAgICAgICAgICAgIHJhZGlvc1tpXVsnTWF0ZXJpYWxSYWRpbyddLnVwZGF0ZUNsYXNzZXNfKCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuLyoqXG4gICAqIEhhbmRsZSBmb2N1cy5cbiAgICpcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnQgVGhlIGV2ZW50IHRoYXQgZmlyZWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxSYWRpby5wcm90b3R5cGUub25Gb2N1c18gPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JU19GT0NVU0VEKTtcbn07XG4vKipcbiAgICogSGFuZGxlIGxvc3QgZm9jdXMuXG4gICAqXG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IFRoZSBldmVudCB0aGF0IGZpcmVkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsUmFkaW8ucHJvdG90eXBlLm9uQmx1cl8gPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5yZW1vdmUodGhpcy5Dc3NDbGFzc2VzXy5JU19GT0NVU0VEKTtcbn07XG4vKipcbiAgICogSGFuZGxlIG1vdXNldXAuXG4gICAqXG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IFRoZSBldmVudCB0aGF0IGZpcmVkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsUmFkaW8ucHJvdG90eXBlLm9uTW91c2V1cF8gPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB0aGlzLmJsdXJfKCk7XG59O1xuLyoqXG4gICAqIFVwZGF0ZSBjbGFzc2VzLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsUmFkaW8ucHJvdG90eXBlLnVwZGF0ZUNsYXNzZXNfID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuY2hlY2tEaXNhYmxlZCgpO1xuICAgIHRoaXMuY2hlY2tUb2dnbGVTdGF0ZSgpO1xufTtcbi8qKlxuICAgKiBBZGQgYmx1ci5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFJhZGlvLnByb3RvdHlwZS5ibHVyXyA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBUT0RPOiBmaWd1cmUgb3V0IHdoeSB0aGVyZSdzIGEgZm9jdXMgZXZlbnQgYmVpbmcgZmlyZWQgYWZ0ZXIgb3VyIGJsdXIsXG4gICAgLy8gc28gdGhhdCB3ZSBjYW4gYXZvaWQgdGhpcyBoYWNrLlxuICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5idG5FbGVtZW50Xy5ibHVyKCk7XG4gICAgfS5iaW5kKHRoaXMpLCB0aGlzLkNvbnN0YW50Xy5USU5ZX1RJTUVPVVQpO1xufTtcbi8vIFB1YmxpYyBtZXRob2RzLlxuLyoqXG4gICAqIENoZWNrIHRoZSBjb21wb25lbnRzIGRpc2FibGVkIHN0YXRlLlxuICAgKlxuICAgKiBAcHVibGljXG4gICAqL1xuTWF0ZXJpYWxSYWRpby5wcm90b3R5cGUuY2hlY2tEaXNhYmxlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5idG5FbGVtZW50Xy5kaXNhYmxlZCkge1xuICAgICAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JU19ESVNBQkxFRCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfRElTQUJMRUQpO1xuICAgIH1cbn07XG5NYXRlcmlhbFJhZGlvLnByb3RvdHlwZVsnY2hlY2tEaXNhYmxlZCddID0gTWF0ZXJpYWxSYWRpby5wcm90b3R5cGUuY2hlY2tEaXNhYmxlZDtcbi8qKlxuICAgKiBDaGVjayB0aGUgY29tcG9uZW50cyB0b2dnbGVkIHN0YXRlLlxuICAgKlxuICAgKiBAcHVibGljXG4gICAqL1xuTWF0ZXJpYWxSYWRpby5wcm90b3R5cGUuY2hlY2tUb2dnbGVTdGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5idG5FbGVtZW50Xy5jaGVja2VkKSB7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLklTX0NIRUNLRUQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LnJlbW92ZSh0aGlzLkNzc0NsYXNzZXNfLklTX0NIRUNLRUQpO1xuICAgIH1cbn07XG5NYXRlcmlhbFJhZGlvLnByb3RvdHlwZVsnY2hlY2tUb2dnbGVTdGF0ZSddID0gTWF0ZXJpYWxSYWRpby5wcm90b3R5cGUuY2hlY2tUb2dnbGVTdGF0ZTtcbi8qKlxuICAgKiBEaXNhYmxlIHJhZGlvLlxuICAgKlxuICAgKiBAcHVibGljXG4gICAqL1xuTWF0ZXJpYWxSYWRpby5wcm90b3R5cGUuZGlzYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmJ0bkVsZW1lbnRfLmRpc2FibGVkID0gdHJ1ZTtcbiAgICB0aGlzLnVwZGF0ZUNsYXNzZXNfKCk7XG59O1xuTWF0ZXJpYWxSYWRpby5wcm90b3R5cGVbJ2Rpc2FibGUnXSA9IE1hdGVyaWFsUmFkaW8ucHJvdG90eXBlLmRpc2FibGU7XG4vKipcbiAgICogRW5hYmxlIHJhZGlvLlxuICAgKlxuICAgKiBAcHVibGljXG4gICAqL1xuTWF0ZXJpYWxSYWRpby5wcm90b3R5cGUuZW5hYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuYnRuRWxlbWVudF8uZGlzYWJsZWQgPSBmYWxzZTtcbiAgICB0aGlzLnVwZGF0ZUNsYXNzZXNfKCk7XG59O1xuTWF0ZXJpYWxSYWRpby5wcm90b3R5cGVbJ2VuYWJsZSddID0gTWF0ZXJpYWxSYWRpby5wcm90b3R5cGUuZW5hYmxlO1xuLyoqXG4gICAqIENoZWNrIHJhZGlvLlxuICAgKlxuICAgKiBAcHVibGljXG4gICAqL1xuTWF0ZXJpYWxSYWRpby5wcm90b3R5cGUuY2hlY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5idG5FbGVtZW50Xy5jaGVja2VkID0gdHJ1ZTtcbiAgICB0aGlzLnVwZGF0ZUNsYXNzZXNfKCk7XG59O1xuTWF0ZXJpYWxSYWRpby5wcm90b3R5cGVbJ2NoZWNrJ10gPSBNYXRlcmlhbFJhZGlvLnByb3RvdHlwZS5jaGVjaztcbi8qKlxuICAgKiBVbmNoZWNrIHJhZGlvLlxuICAgKlxuICAgKiBAcHVibGljXG4gICAqL1xuTWF0ZXJpYWxSYWRpby5wcm90b3R5cGUudW5jaGVjayA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmJ0bkVsZW1lbnRfLmNoZWNrZWQgPSBmYWxzZTtcbiAgICB0aGlzLnVwZGF0ZUNsYXNzZXNfKCk7XG59O1xuTWF0ZXJpYWxSYWRpby5wcm90b3R5cGVbJ3VuY2hlY2snXSA9IE1hdGVyaWFsUmFkaW8ucHJvdG90eXBlLnVuY2hlY2s7XG4vKipcbiAgICogSW5pdGlhbGl6ZSBlbGVtZW50LlxuICAgKi9cbk1hdGVyaWFsUmFkaW8ucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuZWxlbWVudF8pIHtcbiAgICAgICAgdGhpcy5idG5FbGVtZW50XyA9IHRoaXMuZWxlbWVudF8ucXVlcnlTZWxlY3RvcignLicgKyB0aGlzLkNzc0NsYXNzZXNfLlJBRElPX0JUTik7XG4gICAgICAgIHRoaXMuYm91bmRDaGFuZ2VIYW5kbGVyXyA9IHRoaXMub25DaGFuZ2VfLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuYm91bmRGb2N1c0hhbmRsZXJfID0gdGhpcy5vbkNoYW5nZV8uYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5ib3VuZEJsdXJIYW5kbGVyXyA9IHRoaXMub25CbHVyXy5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmJvdW5kTW91c2VVcEhhbmRsZXJfID0gdGhpcy5vbk1vdXNldXBfLmJpbmQodGhpcyk7XG4gICAgICAgIHZhciBvdXRlckNpcmNsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgb3V0ZXJDaXJjbGUuY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLlJBRElPX09VVEVSX0NJUkNMRSk7XG4gICAgICAgIHZhciBpbm5lckNpcmNsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgaW5uZXJDaXJjbGUuY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLlJBRElPX0lOTkVSX0NJUkNMRSk7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uYXBwZW5kQ2hpbGQob3V0ZXJDaXJjbGUpO1xuICAgICAgICB0aGlzLmVsZW1lbnRfLmFwcGVuZENoaWxkKGlubmVyQ2lyY2xlKTtcbiAgICAgICAgdmFyIHJpcHBsZUNvbnRhaW5lcjtcbiAgICAgICAgaWYgKHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uUklQUExFX0VGRkVDVCkpIHtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLlJJUFBMRV9JR05PUkVfRVZFTlRTKTtcbiAgICAgICAgICAgIHJpcHBsZUNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgIHJpcHBsZUNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uUklQUExFX0NPTlRBSU5FUik7XG4gICAgICAgICAgICByaXBwbGVDb250YWluZXIuY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLlJJUFBMRV9FRkZFQ1QpO1xuICAgICAgICAgICAgcmlwcGxlQ29udGFpbmVyLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5SSVBQTEVfQ0VOVEVSKTtcbiAgICAgICAgICAgIHJpcHBsZUNvbnRhaW5lci5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5ib3VuZE1vdXNlVXBIYW5kbGVyXyk7XG4gICAgICAgICAgICB2YXIgcmlwcGxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgcmlwcGxlLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5SSVBQTEUpO1xuICAgICAgICAgICAgcmlwcGxlQ29udGFpbmVyLmFwcGVuZENoaWxkKHJpcHBsZSk7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRfLmFwcGVuZENoaWxkKHJpcHBsZUNvbnRhaW5lcik7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5idG5FbGVtZW50Xy5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCB0aGlzLmJvdW5kQ2hhbmdlSGFuZGxlcl8pO1xuICAgICAgICB0aGlzLmJ0bkVsZW1lbnRfLmFkZEV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgdGhpcy5ib3VuZEZvY3VzSGFuZGxlcl8pO1xuICAgICAgICB0aGlzLmJ0bkVsZW1lbnRfLmFkZEV2ZW50TGlzdGVuZXIoJ2JsdXInLCB0aGlzLmJvdW5kQmx1ckhhbmRsZXJfKTtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5ib3VuZE1vdXNlVXBIYW5kbGVyXyk7XG4gICAgICAgIHRoaXMudXBkYXRlQ2xhc3Nlc18oKTtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfVVBHUkFERUQpO1xuICAgIH1cbn07XG4vLyBUaGUgY29tcG9uZW50IHJlZ2lzdGVycyBpdHNlbGYuIEl0IGNhbiBhc3N1bWUgY29tcG9uZW50SGFuZGxlciBpcyBhdmFpbGFibGVcbi8vIGluIHRoZSBnbG9iYWwgc2NvcGUuXG5jb21wb25lbnRIYW5kbGVyLnJlZ2lzdGVyKHtcbiAgICBjb25zdHJ1Y3RvcjogTWF0ZXJpYWxSYWRpbyxcbiAgICBjbGFzc0FzU3RyaW5nOiAnTWF0ZXJpYWxSYWRpbycsXG4gICAgY3NzQ2xhc3M6ICdtZGwtanMtcmFkaW8nLFxuICAgIHdpZGdldDogdHJ1ZVxufSk7XG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNSBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICAgKiBDbGFzcyBjb25zdHJ1Y3RvciBmb3IgU2xpZGVyIE1ETCBjb21wb25lbnQuXG4gICAqIEltcGxlbWVudHMgTURMIGNvbXBvbmVudCBkZXNpZ24gcGF0dGVybiBkZWZpbmVkIGF0OlxuICAgKiBodHRwczovL2dpdGh1Yi5jb20vamFzb25tYXllcy9tZGwtY29tcG9uZW50LWRlc2lnbi1wYXR0ZXJuXG4gICAqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbGVtZW50IFRoZSBlbGVtZW50IHRoYXQgd2lsbCBiZSB1cGdyYWRlZC5cbiAgICovXG52YXIgTWF0ZXJpYWxTbGlkZXIgPSBmdW5jdGlvbiBNYXRlcmlhbFNsaWRlcihlbGVtZW50KSB7XG4gICAgdGhpcy5lbGVtZW50XyA9IGVsZW1lbnQ7XG4gICAgLy8gQnJvd3NlciBmZWF0dXJlIGRldGVjdGlvbi5cbiAgICB0aGlzLmlzSUVfID0gd2luZG93Lm5hdmlnYXRvci5tc1BvaW50ZXJFbmFibGVkO1xuICAgIC8vIEluaXRpYWxpemUgaW5zdGFuY2UuXG4gICAgdGhpcy5pbml0KCk7XG59O1xud2luZG93WydNYXRlcmlhbFNsaWRlciddID0gTWF0ZXJpYWxTbGlkZXI7XG4vKipcbiAgICogU3RvcmUgY29uc3RhbnRzIGluIG9uZSBwbGFjZSBzbyB0aGV5IGNhbiBiZSB1cGRhdGVkIGVhc2lseS5cbiAgICpcbiAgICogQGVudW0ge3N0cmluZyB8IG51bWJlcn1cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFNsaWRlci5wcm90b3R5cGUuQ29uc3RhbnRfID0ge307XG4vKipcbiAgICogU3RvcmUgc3RyaW5ncyBmb3IgY2xhc3MgbmFtZXMgZGVmaW5lZCBieSB0aGlzIGNvbXBvbmVudCB0aGF0IGFyZSB1c2VkIGluXG4gICAqIEphdmFTY3JpcHQuIFRoaXMgYWxsb3dzIHVzIHRvIHNpbXBseSBjaGFuZ2UgaXQgaW4gb25lIHBsYWNlIHNob3VsZCB3ZVxuICAgKiBkZWNpZGUgdG8gbW9kaWZ5IGF0IGEgbGF0ZXIgZGF0ZS5cbiAgICpcbiAgICogQGVudW0ge3N0cmluZ31cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFNsaWRlci5wcm90b3R5cGUuQ3NzQ2xhc3Nlc18gPSB7XG4gICAgSUVfQ09OVEFJTkVSOiAnbWRsLXNsaWRlcl9faWUtY29udGFpbmVyJyxcbiAgICBTTElERVJfQ09OVEFJTkVSOiAnbWRsLXNsaWRlcl9fY29udGFpbmVyJyxcbiAgICBCQUNLR1JPVU5EX0ZMRVg6ICdtZGwtc2xpZGVyX19iYWNrZ3JvdW5kLWZsZXgnLFxuICAgIEJBQ0tHUk9VTkRfTE9XRVI6ICdtZGwtc2xpZGVyX19iYWNrZ3JvdW5kLWxvd2VyJyxcbiAgICBCQUNLR1JPVU5EX1VQUEVSOiAnbWRsLXNsaWRlcl9fYmFja2dyb3VuZC11cHBlcicsXG4gICAgSVNfTE9XRVNUX1ZBTFVFOiAnaXMtbG93ZXN0LXZhbHVlJyxcbiAgICBJU19VUEdSQURFRDogJ2lzLXVwZ3JhZGVkJ1xufTtcbi8qKlxuICAgKiBIYW5kbGUgaW5wdXQgb24gZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnQgVGhlIGV2ZW50IHRoYXQgZmlyZWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxTbGlkZXIucHJvdG90eXBlLm9uSW5wdXRfID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdGhpcy51cGRhdGVWYWx1ZVN0eWxlc18oKTtcbn07XG4vKipcbiAgICogSGFuZGxlIGNoYW5nZSBvbiBlbGVtZW50LlxuICAgKlxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudCBUaGUgZXZlbnQgdGhhdCBmaXJlZC5cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFNsaWRlci5wcm90b3R5cGUub25DaGFuZ2VfID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdGhpcy51cGRhdGVWYWx1ZVN0eWxlc18oKTtcbn07XG4vKipcbiAgICogSGFuZGxlIG1vdXNldXAgb24gZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnQgVGhlIGV2ZW50IHRoYXQgZmlyZWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxTbGlkZXIucHJvdG90eXBlLm9uTW91c2VVcF8gPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBldmVudC50YXJnZXQuYmx1cigpO1xufTtcbi8qKlxuICAgKiBIYW5kbGUgbW91c2Vkb3duIG9uIGNvbnRhaW5lciBlbGVtZW50LlxuICAgKiBUaGlzIGhhbmRsZXIgaXMgcHVycG9zZSBpcyB0byBub3QgcmVxdWlyZSB0aGUgdXNlIHRvIGNsaWNrXG4gICAqIGV4YWN0bHkgb24gdGhlIDJweCBzbGlkZXIgZWxlbWVudCwgYXMgRmlyZUZveCBzZWVtcyB0byBiZSB2ZXJ5XG4gICAqIHN0cmljdCBhYm91dCB0aGlzLlxuICAgKlxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudCBUaGUgZXZlbnQgdGhhdCBmaXJlZC5cbiAgICogQHByaXZhdGVcbiAgICogQHN1cHByZXNzIHttaXNzaW5nUHJvcGVydGllc31cbiAgICovXG5NYXRlcmlhbFNsaWRlci5wcm90b3R5cGUub25Db250YWluZXJNb3VzZURvd25fID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgLy8gSWYgdGhpcyBjbGljayBpcyBub3Qgb24gdGhlIHBhcmVudCBlbGVtZW50IChidXQgcmF0aGVyIHNvbWUgY2hpbGQpXG4gICAgLy8gaWdub3JlLiBJdCBtYXkgc3RpbGwgYnViYmxlIHVwLlxuICAgIGlmIChldmVudC50YXJnZXQgIT09IHRoaXMuZWxlbWVudF8ucGFyZW50RWxlbWVudCkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIERpc2NhcmQgdGhlIG9yaWdpbmFsIGV2ZW50IGFuZCBjcmVhdGUgYSBuZXcgZXZlbnQgdGhhdFxuICAgIC8vIGlzIG9uIHRoZSBzbGlkZXIgZWxlbWVudC5cbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHZhciBuZXdFdmVudCA9IG5ldyBNb3VzZUV2ZW50KCdtb3VzZWRvd24nLCB7XG4gICAgICAgIHRhcmdldDogZXZlbnQudGFyZ2V0LFxuICAgICAgICBidXR0b25zOiBldmVudC5idXR0b25zLFxuICAgICAgICBjbGllbnRYOiBldmVudC5jbGllbnRYLFxuICAgICAgICBjbGllbnRZOiB0aGlzLmVsZW1lbnRfLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnlcbiAgICB9KTtcbiAgICB0aGlzLmVsZW1lbnRfLmRpc3BhdGNoRXZlbnQobmV3RXZlbnQpO1xufTtcbi8qKlxuICAgKiBIYW5kbGUgdXBkYXRpbmcgb2YgdmFsdWVzLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsU2xpZGVyLnByb3RvdHlwZS51cGRhdGVWYWx1ZVN0eWxlc18gPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gQ2FsY3VsYXRlIGFuZCBhcHBseSBwZXJjZW50YWdlcyB0byBkaXYgc3RydWN0dXJlIGJlaGluZCBzbGlkZXIuXG4gICAgdmFyIGZyYWN0aW9uID0gKHRoaXMuZWxlbWVudF8udmFsdWUgLSB0aGlzLmVsZW1lbnRfLm1pbikgLyAodGhpcy5lbGVtZW50Xy5tYXggLSB0aGlzLmVsZW1lbnRfLm1pbik7XG4gICAgaWYgKGZyYWN0aW9uID09PSAwKSB7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLklTX0xPV0VTVF9WQUxVRSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfTE9XRVNUX1ZBTFVFKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmlzSUVfKSB7XG4gICAgICAgIHRoaXMuYmFja2dyb3VuZExvd2VyXy5zdHlsZS5mbGV4ID0gZnJhY3Rpb247XG4gICAgICAgIHRoaXMuYmFja2dyb3VuZExvd2VyXy5zdHlsZS53ZWJraXRGbGV4ID0gZnJhY3Rpb247XG4gICAgICAgIHRoaXMuYmFja2dyb3VuZFVwcGVyXy5zdHlsZS5mbGV4ID0gMSAtIGZyYWN0aW9uO1xuICAgICAgICB0aGlzLmJhY2tncm91bmRVcHBlcl8uc3R5bGUud2Via2l0RmxleCA9IDEgLSBmcmFjdGlvbjtcbiAgICB9XG59O1xuLy8gUHVibGljIG1ldGhvZHMuXG4vKipcbiAgICogRGlzYWJsZSBzbGlkZXIuXG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICovXG5NYXRlcmlhbFNsaWRlci5wcm90b3R5cGUuZGlzYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmVsZW1lbnRfLmRpc2FibGVkID0gdHJ1ZTtcbn07XG5NYXRlcmlhbFNsaWRlci5wcm90b3R5cGVbJ2Rpc2FibGUnXSA9IE1hdGVyaWFsU2xpZGVyLnByb3RvdHlwZS5kaXNhYmxlO1xuLyoqXG4gICAqIEVuYWJsZSBzbGlkZXIuXG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICovXG5NYXRlcmlhbFNsaWRlci5wcm90b3R5cGUuZW5hYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZWxlbWVudF8uZGlzYWJsZWQgPSBmYWxzZTtcbn07XG5NYXRlcmlhbFNsaWRlci5wcm90b3R5cGVbJ2VuYWJsZSddID0gTWF0ZXJpYWxTbGlkZXIucHJvdG90eXBlLmVuYWJsZTtcbi8qKlxuICAgKiBVcGRhdGUgc2xpZGVyIHZhbHVlLlxuICAgKlxuICAgKiBAcGFyYW0ge251bWJlcn0gdmFsdWUgVGhlIHZhbHVlIHRvIHdoaWNoIHRvIHNldCB0aGUgY29udHJvbCAob3B0aW9uYWwpLlxuICAgKiBAcHVibGljXG4gICAqL1xuTWF0ZXJpYWxTbGlkZXIucHJvdG90eXBlLmNoYW5nZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHRoaXMuZWxlbWVudF8udmFsdWUgPSB2YWx1ZTtcbiAgICB9XG4gICAgdGhpcy51cGRhdGVWYWx1ZVN0eWxlc18oKTtcbn07XG5NYXRlcmlhbFNsaWRlci5wcm90b3R5cGVbJ2NoYW5nZSddID0gTWF0ZXJpYWxTbGlkZXIucHJvdG90eXBlLmNoYW5nZTtcbi8qKlxuICAgKiBJbml0aWFsaXplIGVsZW1lbnQuXG4gICAqL1xuTWF0ZXJpYWxTbGlkZXIucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuZWxlbWVudF8pIHtcbiAgICAgICAgaWYgKHRoaXMuaXNJRV8pIHtcbiAgICAgICAgICAgIC8vIFNpbmNlIHdlIG5lZWQgdG8gc3BlY2lmeSBhIHZlcnkgbGFyZ2UgaGVpZ2h0IGluIElFIGR1ZSB0b1xuICAgICAgICAgICAgLy8gaW1wbGVtZW50YXRpb24gbGltaXRhdGlvbnMsIHdlIGFkZCBhIHBhcmVudCBoZXJlIHRoYXQgdHJpbXMgaXQgZG93biB0b1xuICAgICAgICAgICAgLy8gYSByZWFzb25hYmxlIHNpemUuXG4gICAgICAgICAgICB2YXIgY29udGFpbmVySUUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgIGNvbnRhaW5lcklFLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JRV9DT05UQUlORVIpO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50Xy5wYXJlbnRFbGVtZW50Lmluc2VydEJlZm9yZShjb250YWluZXJJRSwgdGhpcy5lbGVtZW50Xyk7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRfLnBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQodGhpcy5lbGVtZW50Xyk7XG4gICAgICAgICAgICBjb250YWluZXJJRS5hcHBlbmRDaGlsZCh0aGlzLmVsZW1lbnRfKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZvciBub24tSUUgYnJvd3NlcnMsIHdlIG5lZWQgYSBkaXYgc3RydWN0dXJlIHRoYXQgc2l0cyBiZWhpbmQgdGhlXG4gICAgICAgICAgICAvLyBzbGlkZXIgYW5kIGFsbG93cyB1cyB0byBzdHlsZSB0aGUgbGVmdCBhbmQgcmlnaHQgc2lkZXMgb2YgaXQgd2l0aFxuICAgICAgICAgICAgLy8gZGlmZmVyZW50IGNvbG9ycy5cbiAgICAgICAgICAgIHZhciBjb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgIGNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uU0xJREVSX0NPTlRBSU5FUik7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRfLnBhcmVudEVsZW1lbnQuaW5zZXJ0QmVmb3JlKGNvbnRhaW5lciwgdGhpcy5lbGVtZW50Xyk7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRfLnBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQodGhpcy5lbGVtZW50Xyk7XG4gICAgICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQodGhpcy5lbGVtZW50Xyk7XG4gICAgICAgICAgICB2YXIgYmFja2dyb3VuZEZsZXggPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgIGJhY2tncm91bmRGbGV4LmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5CQUNLR1JPVU5EX0ZMRVgpO1xuICAgICAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGJhY2tncm91bmRGbGV4KTtcbiAgICAgICAgICAgIHRoaXMuYmFja2dyb3VuZExvd2VyXyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgdGhpcy5iYWNrZ3JvdW5kTG93ZXJfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5CQUNLR1JPVU5EX0xPV0VSKTtcbiAgICAgICAgICAgIGJhY2tncm91bmRGbGV4LmFwcGVuZENoaWxkKHRoaXMuYmFja2dyb3VuZExvd2VyXyk7XG4gICAgICAgICAgICB0aGlzLmJhY2tncm91bmRVcHBlcl8gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgIHRoaXMuYmFja2dyb3VuZFVwcGVyXy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uQkFDS0dST1VORF9VUFBFUik7XG4gICAgICAgICAgICBiYWNrZ3JvdW5kRmxleC5hcHBlbmRDaGlsZCh0aGlzLmJhY2tncm91bmRVcHBlcl8pO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYm91bmRJbnB1dEhhbmRsZXIgPSB0aGlzLm9uSW5wdXRfLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuYm91bmRDaGFuZ2VIYW5kbGVyID0gdGhpcy5vbkNoYW5nZV8uYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5ib3VuZE1vdXNlVXBIYW5kbGVyID0gdGhpcy5vbk1vdXNlVXBfLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuYm91bmRDb250YWluZXJNb3VzZURvd25IYW5kbGVyID0gdGhpcy5vbkNvbnRhaW5lck1vdXNlRG93bl8uYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsIHRoaXMuYm91bmRJbnB1dEhhbmRsZXIpO1xuICAgICAgICB0aGlzLmVsZW1lbnRfLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIHRoaXMuYm91bmRDaGFuZ2VIYW5kbGVyKTtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5ib3VuZE1vdXNlVXBIYW5kbGVyKTtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5wYXJlbnRFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIHRoaXMuYm91bmRDb250YWluZXJNb3VzZURvd25IYW5kbGVyKTtcbiAgICAgICAgdGhpcy51cGRhdGVWYWx1ZVN0eWxlc18oKTtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfVVBHUkFERUQpO1xuICAgIH1cbn07XG4vLyBUaGUgY29tcG9uZW50IHJlZ2lzdGVycyBpdHNlbGYuIEl0IGNhbiBhc3N1bWUgY29tcG9uZW50SGFuZGxlciBpcyBhdmFpbGFibGVcbi8vIGluIHRoZSBnbG9iYWwgc2NvcGUuXG5jb21wb25lbnRIYW5kbGVyLnJlZ2lzdGVyKHtcbiAgICBjb25zdHJ1Y3RvcjogTWF0ZXJpYWxTbGlkZXIsXG4gICAgY2xhc3NBc1N0cmluZzogJ01hdGVyaWFsU2xpZGVyJyxcbiAgICBjc3NDbGFzczogJ21kbC1qcy1zbGlkZXInLFxuICAgIHdpZGdldDogdHJ1ZVxufSk7XG4vKipcbiAqIENvcHlyaWdodCAyMDE1IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gICAqIENsYXNzIGNvbnN0cnVjdG9yIGZvciBTbmFja2JhciBNREwgY29tcG9uZW50LlxuICAgKiBJbXBsZW1lbnRzIE1ETCBjb21wb25lbnQgZGVzaWduIHBhdHRlcm4gZGVmaW5lZCBhdDpcbiAgICogaHR0cHM6Ly9naXRodWIuY29tL2phc29ubWF5ZXMvbWRsLWNvbXBvbmVudC1kZXNpZ24tcGF0dGVyblxuICAgKlxuICAgKiBAY29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxlbWVudCBUaGUgZWxlbWVudCB0aGF0IHdpbGwgYmUgdXBncmFkZWQuXG4gICAqL1xudmFyIE1hdGVyaWFsU25hY2tiYXIgPSBmdW5jdGlvbiBNYXRlcmlhbFNuYWNrYmFyKGVsZW1lbnQpIHtcbiAgICB0aGlzLmVsZW1lbnRfID0gZWxlbWVudDtcbiAgICB0aGlzLnRleHRFbGVtZW50XyA9IHRoaXMuZWxlbWVudF8ucXVlcnlTZWxlY3RvcignLicgKyB0aGlzLmNzc0NsYXNzZXNfLk1FU1NBR0UpO1xuICAgIHRoaXMuYWN0aW9uRWxlbWVudF8gPSB0aGlzLmVsZW1lbnRfLnF1ZXJ5U2VsZWN0b3IoJy4nICsgdGhpcy5jc3NDbGFzc2VzXy5BQ1RJT04pO1xuICAgIGlmICghdGhpcy50ZXh0RWxlbWVudF8pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGVyZSBtdXN0IGJlIGEgbWVzc2FnZSBlbGVtZW50IGZvciBhIHNuYWNrYmFyLicpO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuYWN0aW9uRWxlbWVudF8pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGVyZSBtdXN0IGJlIGFuIGFjdGlvbiBlbGVtZW50IGZvciBhIHNuYWNrYmFyLicpO1xuICAgIH1cbiAgICB0aGlzLmFjdGl2ZSA9IGZhbHNlO1xuICAgIHRoaXMuYWN0aW9uSGFuZGxlcl8gPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5tZXNzYWdlXyA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLmFjdGlvblRleHRfID0gdW5kZWZpbmVkO1xuICAgIHRoaXMucXVldWVkTm90aWZpY2F0aW9uc18gPSBbXTtcbiAgICB0aGlzLnNldEFjdGlvbkhpZGRlbl8odHJ1ZSk7XG59O1xud2luZG93WydNYXRlcmlhbFNuYWNrYmFyJ10gPSBNYXRlcmlhbFNuYWNrYmFyO1xuLyoqXG4gICAqIFN0b3JlIGNvbnN0YW50cyBpbiBvbmUgcGxhY2Ugc28gdGhleSBjYW4gYmUgdXBkYXRlZCBlYXNpbHkuXG4gICAqXG4gICAqIEBlbnVtIHtzdHJpbmcgfCBudW1iZXJ9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxTbmFja2Jhci5wcm90b3R5cGUuQ29uc3RhbnRfID0ge1xuICAgIC8vIFRoZSBkdXJhdGlvbiBvZiB0aGUgc25hY2tiYXIgc2hvdy9oaWRlIGFuaW1hdGlvbiwgaW4gbXMuXG4gICAgQU5JTUFUSU9OX0xFTkdUSDogMjUwXG59O1xuLyoqXG4gICAqIFN0b3JlIHN0cmluZ3MgZm9yIGNsYXNzIG5hbWVzIGRlZmluZWQgYnkgdGhpcyBjb21wb25lbnQgdGhhdCBhcmUgdXNlZCBpblxuICAgKiBKYXZhU2NyaXB0LiBUaGlzIGFsbG93cyB1cyB0byBzaW1wbHkgY2hhbmdlIGl0IGluIG9uZSBwbGFjZSBzaG91bGQgd2VcbiAgICogZGVjaWRlIHRvIG1vZGlmeSBhdCBhIGxhdGVyIGRhdGUuXG4gICAqXG4gICAqIEBlbnVtIHtzdHJpbmd9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxTbmFja2Jhci5wcm90b3R5cGUuY3NzQ2xhc3Nlc18gPSB7XG4gICAgU05BQ0tCQVI6ICdtZGwtc25hY2tiYXInLFxuICAgIE1FU1NBR0U6ICdtZGwtc25hY2tiYXJfX3RleHQnLFxuICAgIEFDVElPTjogJ21kbC1zbmFja2Jhcl9fYWN0aW9uJyxcbiAgICBBQ1RJVkU6ICdtZGwtc25hY2tiYXItLWFjdGl2ZSdcbn07XG4vKipcbiAgICogRGlzcGxheSB0aGUgc25hY2tiYXIuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxTbmFja2Jhci5wcm90b3R5cGUuZGlzcGxheVNuYWNrYmFyXyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmVsZW1lbnRfLnNldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nLCAndHJ1ZScpO1xuICAgIGlmICh0aGlzLmFjdGlvbkhhbmRsZXJfKSB7XG4gICAgICAgIHRoaXMuYWN0aW9uRWxlbWVudF8udGV4dENvbnRlbnQgPSB0aGlzLmFjdGlvblRleHRfO1xuICAgICAgICB0aGlzLmFjdGlvbkVsZW1lbnRfLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5hY3Rpb25IYW5kbGVyXyk7XG4gICAgICAgIHRoaXMuc2V0QWN0aW9uSGlkZGVuXyhmYWxzZSk7XG4gICAgfVxuICAgIHRoaXMudGV4dEVsZW1lbnRfLnRleHRDb250ZW50ID0gdGhpcy5tZXNzYWdlXztcbiAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5jc3NDbGFzc2VzXy5BQ1RJVkUpO1xuICAgIHRoaXMuZWxlbWVudF8uc2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicsICdmYWxzZScpO1xuICAgIHNldFRpbWVvdXQodGhpcy5jbGVhbnVwXy5iaW5kKHRoaXMpLCB0aGlzLnRpbWVvdXRfKTtcbn07XG4vKipcbiAgICogU2hvdyB0aGUgc25hY2tiYXIuXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIFRoZSBkYXRhIGZvciB0aGUgbm90aWZpY2F0aW9uLlxuICAgKiBAcHVibGljXG4gICAqL1xuTWF0ZXJpYWxTbmFja2Jhci5wcm90b3R5cGUuc2hvd1NuYWNrYmFyID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICBpZiAoZGF0YSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUGxlYXNlIHByb3ZpZGUgYSBkYXRhIG9iamVjdCB3aXRoIGF0IGxlYXN0IGEgbWVzc2FnZSB0byBkaXNwbGF5LicpO1xuICAgIH1cbiAgICBpZiAoZGF0YVsnbWVzc2FnZSddID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQbGVhc2UgcHJvdmlkZSBhIG1lc3NhZ2UgdG8gYmUgZGlzcGxheWVkLicpO1xuICAgIH1cbiAgICBpZiAoZGF0YVsnYWN0aW9uSGFuZGxlciddICYmICFkYXRhWydhY3Rpb25UZXh0J10pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQbGVhc2UgcHJvdmlkZSBhY3Rpb24gdGV4dCB3aXRoIHRoZSBoYW5kbGVyLicpO1xuICAgIH1cbiAgICBpZiAodGhpcy5hY3RpdmUpIHtcbiAgICAgICAgdGhpcy5xdWV1ZWROb3RpZmljYXRpb25zXy5wdXNoKGRhdGEpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuYWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5tZXNzYWdlXyA9IGRhdGFbJ21lc3NhZ2UnXTtcbiAgICAgICAgaWYgKGRhdGFbJ3RpbWVvdXQnXSkge1xuICAgICAgICAgICAgdGhpcy50aW1lb3V0XyA9IGRhdGFbJ3RpbWVvdXQnXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMudGltZW91dF8gPSAyNzUwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhWydhY3Rpb25IYW5kbGVyJ10pIHtcbiAgICAgICAgICAgIHRoaXMuYWN0aW9uSGFuZGxlcl8gPSBkYXRhWydhY3Rpb25IYW5kbGVyJ107XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGFbJ2FjdGlvblRleHQnXSkge1xuICAgICAgICAgICAgdGhpcy5hY3Rpb25UZXh0XyA9IGRhdGFbJ2FjdGlvblRleHQnXTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmRpc3BsYXlTbmFja2Jhcl8oKTtcbiAgICB9XG59O1xuTWF0ZXJpYWxTbmFja2Jhci5wcm90b3R5cGVbJ3Nob3dTbmFja2JhciddID0gTWF0ZXJpYWxTbmFja2Jhci5wcm90b3R5cGUuc2hvd1NuYWNrYmFyO1xuLyoqXG4gICAqIENoZWNrIGlmIHRoZSBxdWV1ZSBoYXMgaXRlbXMgd2l0aGluIGl0LlxuICAgKiBJZiBpdCBkb2VzLCBkaXNwbGF5IHRoZSBuZXh0IGVudHJ5LlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsU25hY2tiYXIucHJvdG90eXBlLmNoZWNrUXVldWVfID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLnF1ZXVlZE5vdGlmaWNhdGlvbnNfLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhpcy5zaG93U25hY2tiYXIodGhpcy5xdWV1ZWROb3RpZmljYXRpb25zXy5zaGlmdCgpKTtcbiAgICB9XG59O1xuLyoqXG4gICAqIENsZWFudXAgdGhlIHNuYWNrYmFyIGV2ZW50IGxpc3RlbmVycyBhbmQgYWNjZXNzaWJsaXR5IGF0dHJpYnV0ZXMuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxTbmFja2Jhci5wcm90b3R5cGUuY2xlYW51cF8gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuY3NzQ2xhc3Nlc18uQUNUSVZFKTtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5zZXRBdHRyaWJ1dGUoJ2FyaWEtaGlkZGVuJywgJ3RydWUnKTtcbiAgICAgICAgdGhpcy50ZXh0RWxlbWVudF8udGV4dENvbnRlbnQgPSAnJztcbiAgICAgICAgaWYgKCFCb29sZWFuKHRoaXMuYWN0aW9uRWxlbWVudF8uZ2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicpKSkge1xuICAgICAgICAgICAgdGhpcy5zZXRBY3Rpb25IaWRkZW5fKHRydWUpO1xuICAgICAgICAgICAgdGhpcy5hY3Rpb25FbGVtZW50Xy50ZXh0Q29udGVudCA9ICcnO1xuICAgICAgICAgICAgdGhpcy5hY3Rpb25FbGVtZW50Xy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuYWN0aW9uSGFuZGxlcl8pO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYWN0aW9uSGFuZGxlcl8gPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMubWVzc2FnZV8gPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuYWN0aW9uVGV4dF8gPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuYWN0aXZlID0gZmFsc2U7XG4gICAgICAgIHRoaXMuY2hlY2tRdWV1ZV8oKTtcbiAgICB9LmJpbmQodGhpcyksIHRoaXMuQ29uc3RhbnRfLkFOSU1BVElPTl9MRU5HVEgpO1xufTtcbi8qKlxuICAgKiBTZXQgdGhlIGFjdGlvbiBoYW5kbGVyIGhpZGRlbiBzdGF0ZS5cbiAgICpcbiAgICogQHBhcmFtIHtib29sZWFufSB2YWx1ZVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsU25hY2tiYXIucHJvdG90eXBlLnNldEFjdGlvbkhpZGRlbl8gPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5hY3Rpb25FbGVtZW50Xy5zZXRBdHRyaWJ1dGUoJ2FyaWEtaGlkZGVuJywgJ3RydWUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmFjdGlvbkVsZW1lbnRfLnJlbW92ZUF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nKTtcbiAgICB9XG59O1xuLy8gVGhlIGNvbXBvbmVudCByZWdpc3RlcnMgaXRzZWxmLiBJdCBjYW4gYXNzdW1lIGNvbXBvbmVudEhhbmRsZXIgaXMgYXZhaWxhYmxlXG4vLyBpbiB0aGUgZ2xvYmFsIHNjb3BlLlxuY29tcG9uZW50SGFuZGxlci5yZWdpc3Rlcih7XG4gICAgY29uc3RydWN0b3I6IE1hdGVyaWFsU25hY2tiYXIsXG4gICAgY2xhc3NBc1N0cmluZzogJ01hdGVyaWFsU25hY2tiYXInLFxuICAgIGNzc0NsYXNzOiAnbWRsLWpzLXNuYWNrYmFyJyxcbiAgICB3aWRnZXQ6IHRydWVcbn0pO1xuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTUgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAgICogQ2xhc3MgY29uc3RydWN0b3IgZm9yIFNwaW5uZXIgTURMIGNvbXBvbmVudC5cbiAgICogSW1wbGVtZW50cyBNREwgY29tcG9uZW50IGRlc2lnbiBwYXR0ZXJuIGRlZmluZWQgYXQ6XG4gICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9qYXNvbm1heWVzL21kbC1jb21wb25lbnQtZGVzaWduLXBhdHRlcm5cbiAgICpcbiAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxlbWVudCBUaGUgZWxlbWVudCB0aGF0IHdpbGwgYmUgdXBncmFkZWQuXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKi9cbnZhciBNYXRlcmlhbFNwaW5uZXIgPSBmdW5jdGlvbiBNYXRlcmlhbFNwaW5uZXIoZWxlbWVudCkge1xuICAgIHRoaXMuZWxlbWVudF8gPSBlbGVtZW50O1xuICAgIC8vIEluaXRpYWxpemUgaW5zdGFuY2UuXG4gICAgdGhpcy5pbml0KCk7XG59O1xud2luZG93WydNYXRlcmlhbFNwaW5uZXInXSA9IE1hdGVyaWFsU3Bpbm5lcjtcbi8qKlxuICAgKiBTdG9yZSBjb25zdGFudHMgaW4gb25lIHBsYWNlIHNvIHRoZXkgY2FuIGJlIHVwZGF0ZWQgZWFzaWx5LlxuICAgKlxuICAgKiBAZW51bSB7c3RyaW5nIHwgbnVtYmVyfVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsU3Bpbm5lci5wcm90b3R5cGUuQ29uc3RhbnRfID0geyBNRExfU1BJTk5FUl9MQVlFUl9DT1VOVDogNCB9O1xuLyoqXG4gICAqIFN0b3JlIHN0cmluZ3MgZm9yIGNsYXNzIG5hbWVzIGRlZmluZWQgYnkgdGhpcyBjb21wb25lbnQgdGhhdCBhcmUgdXNlZCBpblxuICAgKiBKYXZhU2NyaXB0LiBUaGlzIGFsbG93cyB1cyB0byBzaW1wbHkgY2hhbmdlIGl0IGluIG9uZSBwbGFjZSBzaG91bGQgd2VcbiAgICogZGVjaWRlIHRvIG1vZGlmeSBhdCBhIGxhdGVyIGRhdGUuXG4gICAqXG4gICAqIEBlbnVtIHtzdHJpbmd9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxTcGlubmVyLnByb3RvdHlwZS5Dc3NDbGFzc2VzXyA9IHtcbiAgICBNRExfU1BJTk5FUl9MQVlFUjogJ21kbC1zcGlubmVyX19sYXllcicsXG4gICAgTURMX1NQSU5ORVJfQ0lSQ0xFX0NMSVBQRVI6ICdtZGwtc3Bpbm5lcl9fY2lyY2xlLWNsaXBwZXInLFxuICAgIE1ETF9TUElOTkVSX0NJUkNMRTogJ21kbC1zcGlubmVyX19jaXJjbGUnLFxuICAgIE1ETF9TUElOTkVSX0dBUF9QQVRDSDogJ21kbC1zcGlubmVyX19nYXAtcGF0Y2gnLFxuICAgIE1ETF9TUElOTkVSX0xFRlQ6ICdtZGwtc3Bpbm5lcl9fbGVmdCcsXG4gICAgTURMX1NQSU5ORVJfUklHSFQ6ICdtZGwtc3Bpbm5lcl9fcmlnaHQnXG59O1xuLyoqXG4gICAqIEF1eGlsaWFyeSBtZXRob2QgdG8gY3JlYXRlIGEgc3Bpbm5lciBsYXllci5cbiAgICpcbiAgICogQHBhcmFtIHtudW1iZXJ9IGluZGV4IEluZGV4IG9mIHRoZSBsYXllciB0byBiZSBjcmVhdGVkLlxuICAgKiBAcHVibGljXG4gICAqL1xuTWF0ZXJpYWxTcGlubmVyLnByb3RvdHlwZS5jcmVhdGVMYXllciA9IGZ1bmN0aW9uIChpbmRleCkge1xuICAgIHZhciBsYXllciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGxheWVyLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5NRExfU1BJTk5FUl9MQVlFUik7XG4gICAgbGF5ZXIuY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLk1ETF9TUElOTkVSX0xBWUVSICsgJy0nICsgaW5kZXgpO1xuICAgIHZhciBsZWZ0Q2xpcHBlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGxlZnRDbGlwcGVyLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5NRExfU1BJTk5FUl9DSVJDTEVfQ0xJUFBFUik7XG4gICAgbGVmdENsaXBwZXIuY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLk1ETF9TUElOTkVSX0xFRlQpO1xuICAgIHZhciBnYXBQYXRjaCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGdhcFBhdGNoLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5NRExfU1BJTk5FUl9HQVBfUEFUQ0gpO1xuICAgIHZhciByaWdodENsaXBwZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICByaWdodENsaXBwZXIuY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLk1ETF9TUElOTkVSX0NJUkNMRV9DTElQUEVSKTtcbiAgICByaWdodENsaXBwZXIuY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLk1ETF9TUElOTkVSX1JJR0hUKTtcbiAgICB2YXIgY2lyY2xlT3duZXJzID0gW1xuICAgICAgICBsZWZ0Q2xpcHBlcixcbiAgICAgICAgZ2FwUGF0Y2gsXG4gICAgICAgIHJpZ2h0Q2xpcHBlclxuICAgIF07XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaXJjbGVPd25lcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGNpcmNsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICBjaXJjbGUuY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLk1ETF9TUElOTkVSX0NJUkNMRSk7XG4gICAgICAgIGNpcmNsZU93bmVyc1tpXS5hcHBlbmRDaGlsZChjaXJjbGUpO1xuICAgIH1cbiAgICBsYXllci5hcHBlbmRDaGlsZChsZWZ0Q2xpcHBlcik7XG4gICAgbGF5ZXIuYXBwZW5kQ2hpbGQoZ2FwUGF0Y2gpO1xuICAgIGxheWVyLmFwcGVuZENoaWxkKHJpZ2h0Q2xpcHBlcik7XG4gICAgdGhpcy5lbGVtZW50Xy5hcHBlbmRDaGlsZChsYXllcik7XG59O1xuTWF0ZXJpYWxTcGlubmVyLnByb3RvdHlwZVsnY3JlYXRlTGF5ZXInXSA9IE1hdGVyaWFsU3Bpbm5lci5wcm90b3R5cGUuY3JlYXRlTGF5ZXI7XG4vKipcbiAgICogU3RvcHMgdGhlIHNwaW5uZXIgYW5pbWF0aW9uLlxuICAgKiBQdWJsaWMgbWV0aG9kIGZvciB1c2VycyB3aG8gbmVlZCB0byBzdG9wIHRoZSBzcGlubmVyIGZvciBhbnkgcmVhc29uLlxuICAgKlxuICAgKiBAcHVibGljXG4gICAqL1xuTWF0ZXJpYWxTcGlubmVyLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LnJlbW92ZSgnaXMtYWN0aXZlJyk7XG59O1xuTWF0ZXJpYWxTcGlubmVyLnByb3RvdHlwZVsnc3RvcCddID0gTWF0ZXJpYWxTcGlubmVyLnByb3RvdHlwZS5zdG9wO1xuLyoqXG4gICAqIFN0YXJ0cyB0aGUgc3Bpbm5lciBhbmltYXRpb24uXG4gICAqIFB1YmxpYyBtZXRob2QgZm9yIHVzZXJzIHdobyBuZWVkIHRvIG1hbnVhbGx5IHN0YXJ0IHRoZSBzcGlubmVyIGZvciBhbnkgcmVhc29uXG4gICAqIChpbnN0ZWFkIG9mIGp1c3QgYWRkaW5nIHRoZSAnaXMtYWN0aXZlJyBjbGFzcyB0byB0aGVpciBtYXJrdXApLlxuICAgKlxuICAgKiBAcHVibGljXG4gICAqL1xuTWF0ZXJpYWxTcGlubmVyLnByb3RvdHlwZS5zdGFydCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5hZGQoJ2lzLWFjdGl2ZScpO1xufTtcbk1hdGVyaWFsU3Bpbm5lci5wcm90b3R5cGVbJ3N0YXJ0J10gPSBNYXRlcmlhbFNwaW5uZXIucHJvdG90eXBlLnN0YXJ0O1xuLyoqXG4gICAqIEluaXRpYWxpemUgZWxlbWVudC5cbiAgICovXG5NYXRlcmlhbFNwaW5uZXIucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuZWxlbWVudF8pIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPD0gdGhpcy5Db25zdGFudF8uTURMX1NQSU5ORVJfTEFZRVJfQ09VTlQ7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5jcmVhdGVMYXllcihpKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5hZGQoJ2lzLXVwZ3JhZGVkJyk7XG4gICAgfVxufTtcbi8vIFRoZSBjb21wb25lbnQgcmVnaXN0ZXJzIGl0c2VsZi4gSXQgY2FuIGFzc3VtZSBjb21wb25lbnRIYW5kbGVyIGlzIGF2YWlsYWJsZVxuLy8gaW4gdGhlIGdsb2JhbCBzY29wZS5cbmNvbXBvbmVudEhhbmRsZXIucmVnaXN0ZXIoe1xuICAgIGNvbnN0cnVjdG9yOiBNYXRlcmlhbFNwaW5uZXIsXG4gICAgY2xhc3NBc1N0cmluZzogJ01hdGVyaWFsU3Bpbm5lcicsXG4gICAgY3NzQ2xhc3M6ICdtZGwtanMtc3Bpbm5lcicsXG4gICAgd2lkZ2V0OiB0cnVlXG59KTtcbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE1IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gICAqIENsYXNzIGNvbnN0cnVjdG9yIGZvciBDaGVja2JveCBNREwgY29tcG9uZW50LlxuICAgKiBJbXBsZW1lbnRzIE1ETCBjb21wb25lbnQgZGVzaWduIHBhdHRlcm4gZGVmaW5lZCBhdDpcbiAgICogaHR0cHM6Ly9naXRodWIuY29tL2phc29ubWF5ZXMvbWRsLWNvbXBvbmVudC1kZXNpZ24tcGF0dGVyblxuICAgKlxuICAgKiBAY29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxlbWVudCBUaGUgZWxlbWVudCB0aGF0IHdpbGwgYmUgdXBncmFkZWQuXG4gICAqL1xudmFyIE1hdGVyaWFsU3dpdGNoID0gZnVuY3Rpb24gTWF0ZXJpYWxTd2l0Y2goZWxlbWVudCkge1xuICAgIHRoaXMuZWxlbWVudF8gPSBlbGVtZW50O1xuICAgIC8vIEluaXRpYWxpemUgaW5zdGFuY2UuXG4gICAgdGhpcy5pbml0KCk7XG59O1xud2luZG93WydNYXRlcmlhbFN3aXRjaCddID0gTWF0ZXJpYWxTd2l0Y2g7XG4vKipcbiAgICogU3RvcmUgY29uc3RhbnRzIGluIG9uZSBwbGFjZSBzbyB0aGV5IGNhbiBiZSB1cGRhdGVkIGVhc2lseS5cbiAgICpcbiAgICogQGVudW0ge3N0cmluZyB8IG51bWJlcn1cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFN3aXRjaC5wcm90b3R5cGUuQ29uc3RhbnRfID0geyBUSU5ZX1RJTUVPVVQ6IDAuMDAxIH07XG4vKipcbiAgICogU3RvcmUgc3RyaW5ncyBmb3IgY2xhc3MgbmFtZXMgZGVmaW5lZCBieSB0aGlzIGNvbXBvbmVudCB0aGF0IGFyZSB1c2VkIGluXG4gICAqIEphdmFTY3JpcHQuIFRoaXMgYWxsb3dzIHVzIHRvIHNpbXBseSBjaGFuZ2UgaXQgaW4gb25lIHBsYWNlIHNob3VsZCB3ZVxuICAgKiBkZWNpZGUgdG8gbW9kaWZ5IGF0IGEgbGF0ZXIgZGF0ZS5cbiAgICpcbiAgICogQGVudW0ge3N0cmluZ31cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFN3aXRjaC5wcm90b3R5cGUuQ3NzQ2xhc3Nlc18gPSB7XG4gICAgSU5QVVQ6ICdtZGwtc3dpdGNoX19pbnB1dCcsXG4gICAgVFJBQ0s6ICdtZGwtc3dpdGNoX190cmFjaycsXG4gICAgVEhVTUI6ICdtZGwtc3dpdGNoX190aHVtYicsXG4gICAgRk9DVVNfSEVMUEVSOiAnbWRsLXN3aXRjaF9fZm9jdXMtaGVscGVyJyxcbiAgICBSSVBQTEVfRUZGRUNUOiAnbWRsLWpzLXJpcHBsZS1lZmZlY3QnLFxuICAgIFJJUFBMRV9JR05PUkVfRVZFTlRTOiAnbWRsLWpzLXJpcHBsZS1lZmZlY3QtLWlnbm9yZS1ldmVudHMnLFxuICAgIFJJUFBMRV9DT05UQUlORVI6ICdtZGwtc3dpdGNoX19yaXBwbGUtY29udGFpbmVyJyxcbiAgICBSSVBQTEVfQ0VOVEVSOiAnbWRsLXJpcHBsZS0tY2VudGVyJyxcbiAgICBSSVBQTEU6ICdtZGwtcmlwcGxlJyxcbiAgICBJU19GT0NVU0VEOiAnaXMtZm9jdXNlZCcsXG4gICAgSVNfRElTQUJMRUQ6ICdpcy1kaXNhYmxlZCcsXG4gICAgSVNfQ0hFQ0tFRDogJ2lzLWNoZWNrZWQnXG59O1xuLyoqXG4gICAqIEhhbmRsZSBjaGFuZ2Ugb2Ygc3RhdGUuXG4gICAqXG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IFRoZSBldmVudCB0aGF0IGZpcmVkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsU3dpdGNoLnByb3RvdHlwZS5vbkNoYW5nZV8gPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB0aGlzLnVwZGF0ZUNsYXNzZXNfKCk7XG59O1xuLyoqXG4gICAqIEhhbmRsZSBmb2N1cyBvZiBlbGVtZW50LlxuICAgKlxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudCBUaGUgZXZlbnQgdGhhdCBmaXJlZC5cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFN3aXRjaC5wcm90b3R5cGUub25Gb2N1c18gPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JU19GT0NVU0VEKTtcbn07XG4vKipcbiAgICogSGFuZGxlIGxvc3QgZm9jdXMgb2YgZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnQgVGhlIGV2ZW50IHRoYXQgZmlyZWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxTd2l0Y2gucHJvdG90eXBlLm9uQmx1cl8gPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5yZW1vdmUodGhpcy5Dc3NDbGFzc2VzXy5JU19GT0NVU0VEKTtcbn07XG4vKipcbiAgICogSGFuZGxlIG1vdXNldXAuXG4gICAqXG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IFRoZSBldmVudCB0aGF0IGZpcmVkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsU3dpdGNoLnByb3RvdHlwZS5vbk1vdXNlVXBfID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdGhpcy5ibHVyXygpO1xufTtcbi8qKlxuICAgKiBIYW5kbGUgY2xhc3MgdXBkYXRlcy5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFN3aXRjaC5wcm90b3R5cGUudXBkYXRlQ2xhc3Nlc18gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5jaGVja0Rpc2FibGVkKCk7XG4gICAgdGhpcy5jaGVja1RvZ2dsZVN0YXRlKCk7XG59O1xuLyoqXG4gICAqIEFkZCBibHVyLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsU3dpdGNoLnByb3RvdHlwZS5ibHVyXyA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBUT0RPOiBmaWd1cmUgb3V0IHdoeSB0aGVyZSdzIGEgZm9jdXMgZXZlbnQgYmVpbmcgZmlyZWQgYWZ0ZXIgb3VyIGJsdXIsXG4gICAgLy8gc28gdGhhdCB3ZSBjYW4gYXZvaWQgdGhpcyBoYWNrLlxuICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5pbnB1dEVsZW1lbnRfLmJsdXIoKTtcbiAgICB9LmJpbmQodGhpcyksIHRoaXMuQ29uc3RhbnRfLlRJTllfVElNRU9VVCk7XG59O1xuLy8gUHVibGljIG1ldGhvZHMuXG4vKipcbiAgICogQ2hlY2sgdGhlIGNvbXBvbmVudHMgZGlzYWJsZWQgc3RhdGUuXG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICovXG5NYXRlcmlhbFN3aXRjaC5wcm90b3R5cGUuY2hlY2tEaXNhYmxlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5pbnB1dEVsZW1lbnRfLmRpc2FibGVkKSB7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLklTX0RJU0FCTEVEKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5yZW1vdmUodGhpcy5Dc3NDbGFzc2VzXy5JU19ESVNBQkxFRCk7XG4gICAgfVxufTtcbk1hdGVyaWFsU3dpdGNoLnByb3RvdHlwZVsnY2hlY2tEaXNhYmxlZCddID0gTWF0ZXJpYWxTd2l0Y2gucHJvdG90eXBlLmNoZWNrRGlzYWJsZWQ7XG4vKipcbiAgICogQ2hlY2sgdGhlIGNvbXBvbmVudHMgdG9nZ2xlZCBzdGF0ZS5cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKi9cbk1hdGVyaWFsU3dpdGNoLnByb3RvdHlwZS5jaGVja1RvZ2dsZVN0YXRlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmlucHV0RWxlbWVudF8uY2hlY2tlZCkge1xuICAgICAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JU19DSEVDS0VEKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5yZW1vdmUodGhpcy5Dc3NDbGFzc2VzXy5JU19DSEVDS0VEKTtcbiAgICB9XG59O1xuTWF0ZXJpYWxTd2l0Y2gucHJvdG90eXBlWydjaGVja1RvZ2dsZVN0YXRlJ10gPSBNYXRlcmlhbFN3aXRjaC5wcm90b3R5cGUuY2hlY2tUb2dnbGVTdGF0ZTtcbi8qKlxuICAgKiBEaXNhYmxlIHN3aXRjaC5cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKi9cbk1hdGVyaWFsU3dpdGNoLnByb3RvdHlwZS5kaXNhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuaW5wdXRFbGVtZW50Xy5kaXNhYmxlZCA9IHRydWU7XG4gICAgdGhpcy51cGRhdGVDbGFzc2VzXygpO1xufTtcbk1hdGVyaWFsU3dpdGNoLnByb3RvdHlwZVsnZGlzYWJsZSddID0gTWF0ZXJpYWxTd2l0Y2gucHJvdG90eXBlLmRpc2FibGU7XG4vKipcbiAgICogRW5hYmxlIHN3aXRjaC5cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKi9cbk1hdGVyaWFsU3dpdGNoLnByb3RvdHlwZS5lbmFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5pbnB1dEVsZW1lbnRfLmRpc2FibGVkID0gZmFsc2U7XG4gICAgdGhpcy51cGRhdGVDbGFzc2VzXygpO1xufTtcbk1hdGVyaWFsU3dpdGNoLnByb3RvdHlwZVsnZW5hYmxlJ10gPSBNYXRlcmlhbFN3aXRjaC5wcm90b3R5cGUuZW5hYmxlO1xuLyoqXG4gICAqIEFjdGl2YXRlIHN3aXRjaC5cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKi9cbk1hdGVyaWFsU3dpdGNoLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmlucHV0RWxlbWVudF8uY2hlY2tlZCA9IHRydWU7XG4gICAgdGhpcy51cGRhdGVDbGFzc2VzXygpO1xufTtcbk1hdGVyaWFsU3dpdGNoLnByb3RvdHlwZVsnb24nXSA9IE1hdGVyaWFsU3dpdGNoLnByb3RvdHlwZS5vbjtcbi8qKlxuICAgKiBEZWFjdGl2YXRlIHN3aXRjaC5cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKi9cbk1hdGVyaWFsU3dpdGNoLnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5pbnB1dEVsZW1lbnRfLmNoZWNrZWQgPSBmYWxzZTtcbiAgICB0aGlzLnVwZGF0ZUNsYXNzZXNfKCk7XG59O1xuTWF0ZXJpYWxTd2l0Y2gucHJvdG90eXBlWydvZmYnXSA9IE1hdGVyaWFsU3dpdGNoLnByb3RvdHlwZS5vZmY7XG4vKipcbiAgICogSW5pdGlhbGl6ZSBlbGVtZW50LlxuICAgKi9cbk1hdGVyaWFsU3dpdGNoLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmVsZW1lbnRfKSB7XG4gICAgICAgIHRoaXMuaW5wdXRFbGVtZW50XyA9IHRoaXMuZWxlbWVudF8ucXVlcnlTZWxlY3RvcignLicgKyB0aGlzLkNzc0NsYXNzZXNfLklOUFVUKTtcbiAgICAgICAgdmFyIHRyYWNrID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIHRyYWNrLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5UUkFDSyk7XG4gICAgICAgIHZhciB0aHVtYiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICB0aHVtYi5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uVEhVTUIpO1xuICAgICAgICB2YXIgZm9jdXNIZWxwZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgIGZvY3VzSGVscGVyLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5GT0NVU19IRUxQRVIpO1xuICAgICAgICB0aHVtYi5hcHBlbmRDaGlsZChmb2N1c0hlbHBlcik7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uYXBwZW5kQ2hpbGQodHJhY2spO1xuICAgICAgICB0aGlzLmVsZW1lbnRfLmFwcGVuZENoaWxkKHRodW1iKTtcbiAgICAgICAgdGhpcy5ib3VuZE1vdXNlVXBIYW5kbGVyID0gdGhpcy5vbk1vdXNlVXBfLmJpbmQodGhpcyk7XG4gICAgICAgIGlmICh0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLlJJUFBMRV9FRkZFQ1QpKSB7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5SSVBQTEVfSUdOT1JFX0VWRU5UUyk7XG4gICAgICAgICAgICB0aGlzLnJpcHBsZUNvbnRhaW5lckVsZW1lbnRfID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgdGhpcy5yaXBwbGVDb250YWluZXJFbGVtZW50Xy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uUklQUExFX0NPTlRBSU5FUik7XG4gICAgICAgICAgICB0aGlzLnJpcHBsZUNvbnRhaW5lckVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5SSVBQTEVfRUZGRUNUKTtcbiAgICAgICAgICAgIHRoaXMucmlwcGxlQ29udGFpbmVyRWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLlJJUFBMRV9DRU5URVIpO1xuICAgICAgICAgICAgdGhpcy5yaXBwbGVDb250YWluZXJFbGVtZW50Xy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5ib3VuZE1vdXNlVXBIYW5kbGVyKTtcbiAgICAgICAgICAgIHZhciByaXBwbGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICByaXBwbGUuY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLlJJUFBMRSk7XG4gICAgICAgICAgICB0aGlzLnJpcHBsZUNvbnRhaW5lckVsZW1lbnRfLmFwcGVuZENoaWxkKHJpcHBsZSk7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRfLmFwcGVuZENoaWxkKHRoaXMucmlwcGxlQ29udGFpbmVyRWxlbWVudF8pO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYm91bmRDaGFuZ2VIYW5kbGVyID0gdGhpcy5vbkNoYW5nZV8uYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5ib3VuZEZvY3VzSGFuZGxlciA9IHRoaXMub25Gb2N1c18uYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5ib3VuZEJsdXJIYW5kbGVyID0gdGhpcy5vbkJsdXJfLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuaW5wdXRFbGVtZW50Xy5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCB0aGlzLmJvdW5kQ2hhbmdlSGFuZGxlcik7XG4gICAgICAgIHRoaXMuaW5wdXRFbGVtZW50Xy5hZGRFdmVudExpc3RlbmVyKCdmb2N1cycsIHRoaXMuYm91bmRGb2N1c0hhbmRsZXIpO1xuICAgICAgICB0aGlzLmlucHV0RWxlbWVudF8uYWRkRXZlbnRMaXN0ZW5lcignYmx1cicsIHRoaXMuYm91bmRCbHVySGFuZGxlcik7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuYm91bmRNb3VzZVVwSGFuZGxlcik7XG4gICAgICAgIHRoaXMudXBkYXRlQ2xhc3Nlc18oKTtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuYWRkKCdpcy11cGdyYWRlZCcpO1xuICAgIH1cbn07XG4vLyBUaGUgY29tcG9uZW50IHJlZ2lzdGVycyBpdHNlbGYuIEl0IGNhbiBhc3N1bWUgY29tcG9uZW50SGFuZGxlciBpcyBhdmFpbGFibGVcbi8vIGluIHRoZSBnbG9iYWwgc2NvcGUuXG5jb21wb25lbnRIYW5kbGVyLnJlZ2lzdGVyKHtcbiAgICBjb25zdHJ1Y3RvcjogTWF0ZXJpYWxTd2l0Y2gsXG4gICAgY2xhc3NBc1N0cmluZzogJ01hdGVyaWFsU3dpdGNoJyxcbiAgICBjc3NDbGFzczogJ21kbC1qcy1zd2l0Y2gnLFxuICAgIHdpZGdldDogdHJ1ZVxufSk7XG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNSBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICAgKiBDbGFzcyBjb25zdHJ1Y3RvciBmb3IgVGFicyBNREwgY29tcG9uZW50LlxuICAgKiBJbXBsZW1lbnRzIE1ETCBjb21wb25lbnQgZGVzaWduIHBhdHRlcm4gZGVmaW5lZCBhdDpcbiAgICogaHR0cHM6Ly9naXRodWIuY29tL2phc29ubWF5ZXMvbWRsLWNvbXBvbmVudC1kZXNpZ24tcGF0dGVyblxuICAgKlxuICAgKiBAY29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtFbGVtZW50fSBlbGVtZW50IFRoZSBlbGVtZW50IHRoYXQgd2lsbCBiZSB1cGdyYWRlZC5cbiAgICovXG52YXIgTWF0ZXJpYWxUYWJzID0gZnVuY3Rpb24gTWF0ZXJpYWxUYWJzKGVsZW1lbnQpIHtcbiAgICAvLyBTdG9yZXMgdGhlIEhUTUwgZWxlbWVudC5cbiAgICB0aGlzLmVsZW1lbnRfID0gZWxlbWVudDtcbiAgICAvLyBJbml0aWFsaXplIGluc3RhbmNlLlxuICAgIHRoaXMuaW5pdCgpO1xufTtcbndpbmRvd1snTWF0ZXJpYWxUYWJzJ10gPSBNYXRlcmlhbFRhYnM7XG4vKipcbiAgICogU3RvcmUgY29uc3RhbnRzIGluIG9uZSBwbGFjZSBzbyB0aGV5IGNhbiBiZSB1cGRhdGVkIGVhc2lseS5cbiAgICpcbiAgICogQGVudW0ge3N0cmluZ31cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFRhYnMucHJvdG90eXBlLkNvbnN0YW50XyA9IHt9O1xuLyoqXG4gICAqIFN0b3JlIHN0cmluZ3MgZm9yIGNsYXNzIG5hbWVzIGRlZmluZWQgYnkgdGhpcyBjb21wb25lbnQgdGhhdCBhcmUgdXNlZCBpblxuICAgKiBKYXZhU2NyaXB0LiBUaGlzIGFsbG93cyB1cyB0byBzaW1wbHkgY2hhbmdlIGl0IGluIG9uZSBwbGFjZSBzaG91bGQgd2VcbiAgICogZGVjaWRlIHRvIG1vZGlmeSBhdCBhIGxhdGVyIGRhdGUuXG4gICAqXG4gICAqIEBlbnVtIHtzdHJpbmd9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxUYWJzLnByb3RvdHlwZS5Dc3NDbGFzc2VzXyA9IHtcbiAgICBUQUJfQ0xBU1M6ICdtZGwtdGFic19fdGFiJyxcbiAgICBQQU5FTF9DTEFTUzogJ21kbC10YWJzX19wYW5lbCcsXG4gICAgQUNUSVZFX0NMQVNTOiAnaXMtYWN0aXZlJyxcbiAgICBVUEdSQURFRF9DTEFTUzogJ2lzLXVwZ3JhZGVkJyxcbiAgICBNRExfSlNfUklQUExFX0VGRkVDVDogJ21kbC1qcy1yaXBwbGUtZWZmZWN0JyxcbiAgICBNRExfUklQUExFX0NPTlRBSU5FUjogJ21kbC10YWJzX19yaXBwbGUtY29udGFpbmVyJyxcbiAgICBNRExfUklQUExFOiAnbWRsLXJpcHBsZScsXG4gICAgTURMX0pTX1JJUFBMRV9FRkZFQ1RfSUdOT1JFX0VWRU5UUzogJ21kbC1qcy1yaXBwbGUtZWZmZWN0LS1pZ25vcmUtZXZlbnRzJ1xufTtcbi8qKlxuICAgKiBIYW5kbGUgY2xpY2tzIHRvIGEgdGFicyBjb21wb25lbnRcbiAgICpcbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFRhYnMucHJvdG90eXBlLmluaXRUYWJzXyA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5NRExfSlNfUklQUExFX0VGRkVDVCkpIHtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uTURMX0pTX1JJUFBMRV9FRkZFQ1RfSUdOT1JFX0VWRU5UUyk7XG4gICAgfVxuICAgIC8vIFNlbGVjdCBlbGVtZW50IHRhYnMsIGRvY3VtZW50IHBhbmVsc1xuICAgIHRoaXMudGFic18gPSB0aGlzLmVsZW1lbnRfLnF1ZXJ5U2VsZWN0b3JBbGwoJy4nICsgdGhpcy5Dc3NDbGFzc2VzXy5UQUJfQ0xBU1MpO1xuICAgIHRoaXMucGFuZWxzXyA9IHRoaXMuZWxlbWVudF8ucXVlcnlTZWxlY3RvckFsbCgnLicgKyB0aGlzLkNzc0NsYXNzZXNfLlBBTkVMX0NMQVNTKTtcbiAgICAvLyBDcmVhdGUgbmV3IHRhYnMgZm9yIGVhY2ggdGFiIGVsZW1lbnRcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMudGFic18ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbmV3IE1hdGVyaWFsVGFiKHRoaXMudGFic19baV0sIHRoaXMpO1xuICAgIH1cbiAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5VUEdSQURFRF9DTEFTUyk7XG59O1xuLyoqXG4gICAqIFJlc2V0IHRhYiBzdGF0ZSwgZHJvcHBpbmcgYWN0aXZlIGNsYXNzZXNcbiAgICpcbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFRhYnMucHJvdG90eXBlLnJlc2V0VGFiU3RhdGVfID0gZnVuY3Rpb24gKCkge1xuICAgIGZvciAodmFyIGsgPSAwOyBrIDwgdGhpcy50YWJzXy5sZW5ndGg7IGsrKykge1xuICAgICAgICB0aGlzLnRhYnNfW2tdLmNsYXNzTGlzdC5yZW1vdmUodGhpcy5Dc3NDbGFzc2VzXy5BQ1RJVkVfQ0xBU1MpO1xuICAgIH1cbn07XG4vKipcbiAgICogUmVzZXQgcGFuZWwgc3RhdGUsIGRyb3BpbmcgYWN0aXZlIGNsYXNzZXNcbiAgICpcbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFRhYnMucHJvdG90eXBlLnJlc2V0UGFuZWxTdGF0ZV8gPSBmdW5jdGlvbiAoKSB7XG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCB0aGlzLnBhbmVsc18ubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgdGhpcy5wYW5lbHNfW2pdLmNsYXNzTGlzdC5yZW1vdmUodGhpcy5Dc3NDbGFzc2VzXy5BQ1RJVkVfQ0xBU1MpO1xuICAgIH1cbn07XG4vKipcbiAgICogSW5pdGlhbGl6ZSBlbGVtZW50LlxuICAgKi9cbk1hdGVyaWFsVGFicy5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5lbGVtZW50Xykge1xuICAgICAgICB0aGlzLmluaXRUYWJzXygpO1xuICAgIH1cbn07XG4vKipcbiAgICogQ29uc3RydWN0b3IgZm9yIGFuIGluZGl2aWR1YWwgdGFiLlxuICAgKlxuICAgKiBAY29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtFbGVtZW50fSB0YWIgVGhlIEhUTUwgZWxlbWVudCBmb3IgdGhlIHRhYi5cbiAgICogQHBhcmFtIHtNYXRlcmlhbFRhYnN9IGN0eCBUaGUgTWF0ZXJpYWxUYWJzIG9iamVjdCB0aGF0IG93bnMgdGhlIHRhYi5cbiAgICovXG5mdW5jdGlvbiBNYXRlcmlhbFRhYih0YWIsIGN0eCkge1xuICAgIGlmICh0YWIpIHtcbiAgICAgICAgaWYgKGN0eC5lbGVtZW50Xy5jbGFzc0xpc3QuY29udGFpbnMoY3R4LkNzc0NsYXNzZXNfLk1ETF9KU19SSVBQTEVfRUZGRUNUKSkge1xuICAgICAgICAgICAgdmFyIHJpcHBsZUNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgIHJpcHBsZUNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKGN0eC5Dc3NDbGFzc2VzXy5NRExfUklQUExFX0NPTlRBSU5FUik7XG4gICAgICAgICAgICByaXBwbGVDb250YWluZXIuY2xhc3NMaXN0LmFkZChjdHguQ3NzQ2xhc3Nlc18uTURMX0pTX1JJUFBMRV9FRkZFQ1QpO1xuICAgICAgICAgICAgdmFyIHJpcHBsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgIHJpcHBsZS5jbGFzc0xpc3QuYWRkKGN0eC5Dc3NDbGFzc2VzXy5NRExfUklQUExFKTtcbiAgICAgICAgICAgIHJpcHBsZUNvbnRhaW5lci5hcHBlbmRDaGlsZChyaXBwbGUpO1xuICAgICAgICAgICAgdGFiLmFwcGVuZENoaWxkKHJpcHBsZUNvbnRhaW5lcik7XG4gICAgICAgIH1cbiAgICAgICAgdGFiLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHZhciBocmVmID0gdGFiLmhyZWYuc3BsaXQoJyMnKVsxXTtcbiAgICAgICAgICAgIHZhciBwYW5lbCA9IGN0eC5lbGVtZW50Xy5xdWVyeVNlbGVjdG9yKCcjJyArIGhyZWYpO1xuICAgICAgICAgICAgY3R4LnJlc2V0VGFiU3RhdGVfKCk7XG4gICAgICAgICAgICBjdHgucmVzZXRQYW5lbFN0YXRlXygpO1xuICAgICAgICAgICAgdGFiLmNsYXNzTGlzdC5hZGQoY3R4LkNzc0NsYXNzZXNfLkFDVElWRV9DTEFTUyk7XG4gICAgICAgICAgICBwYW5lbC5jbGFzc0xpc3QuYWRkKGN0eC5Dc3NDbGFzc2VzXy5BQ1RJVkVfQ0xBU1MpO1xuICAgICAgICB9KTtcbiAgICB9XG59XG4vLyBUaGUgY29tcG9uZW50IHJlZ2lzdGVycyBpdHNlbGYuIEl0IGNhbiBhc3N1bWUgY29tcG9uZW50SGFuZGxlciBpcyBhdmFpbGFibGVcbi8vIGluIHRoZSBnbG9iYWwgc2NvcGUuXG5jb21wb25lbnRIYW5kbGVyLnJlZ2lzdGVyKHtcbiAgICBjb25zdHJ1Y3RvcjogTWF0ZXJpYWxUYWJzLFxuICAgIGNsYXNzQXNTdHJpbmc6ICdNYXRlcmlhbFRhYnMnLFxuICAgIGNzc0NsYXNzOiAnbWRsLWpzLXRhYnMnXG59KTtcbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE1IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gICAqIENsYXNzIGNvbnN0cnVjdG9yIGZvciBUZXh0ZmllbGQgTURMIGNvbXBvbmVudC5cbiAgICogSW1wbGVtZW50cyBNREwgY29tcG9uZW50IGRlc2lnbiBwYXR0ZXJuIGRlZmluZWQgYXQ6XG4gICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9qYXNvbm1heWVzL21kbC1jb21wb25lbnQtZGVzaWduLXBhdHRlcm5cbiAgICpcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsZW1lbnQgVGhlIGVsZW1lbnQgdGhhdCB3aWxsIGJlIHVwZ3JhZGVkLlxuICAgKi9cbnZhciBNYXRlcmlhbFRleHRmaWVsZCA9IGZ1bmN0aW9uIE1hdGVyaWFsVGV4dGZpZWxkKGVsZW1lbnQpIHtcbiAgICB0aGlzLmVsZW1lbnRfID0gZWxlbWVudDtcbiAgICB0aGlzLm1heFJvd3MgPSB0aGlzLkNvbnN0YW50Xy5OT19NQVhfUk9XUztcbiAgICAvLyBJbml0aWFsaXplIGluc3RhbmNlLlxuICAgIHRoaXMuaW5pdCgpO1xufTtcbndpbmRvd1snTWF0ZXJpYWxUZXh0ZmllbGQnXSA9IE1hdGVyaWFsVGV4dGZpZWxkO1xuLyoqXG4gICAqIFN0b3JlIGNvbnN0YW50cyBpbiBvbmUgcGxhY2Ugc28gdGhleSBjYW4gYmUgdXBkYXRlZCBlYXNpbHkuXG4gICAqXG4gICAqIEBlbnVtIHtzdHJpbmcgfCBudW1iZXJ9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxUZXh0ZmllbGQucHJvdG90eXBlLkNvbnN0YW50XyA9IHtcbiAgICBOT19NQVhfUk9XUzogLTEsXG4gICAgTUFYX1JPV1NfQVRUUklCVVRFOiAnbWF4cm93cydcbn07XG4vKipcbiAgICogU3RvcmUgc3RyaW5ncyBmb3IgY2xhc3MgbmFtZXMgZGVmaW5lZCBieSB0aGlzIGNvbXBvbmVudCB0aGF0IGFyZSB1c2VkIGluXG4gICAqIEphdmFTY3JpcHQuIFRoaXMgYWxsb3dzIHVzIHRvIHNpbXBseSBjaGFuZ2UgaXQgaW4gb25lIHBsYWNlIHNob3VsZCB3ZVxuICAgKiBkZWNpZGUgdG8gbW9kaWZ5IGF0IGEgbGF0ZXIgZGF0ZS5cbiAgICpcbiAgICogQGVudW0ge3N0cmluZ31cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFRleHRmaWVsZC5wcm90b3R5cGUuQ3NzQ2xhc3Nlc18gPSB7XG4gICAgTEFCRUw6ICdtZGwtdGV4dGZpZWxkX19sYWJlbCcsXG4gICAgSU5QVVQ6ICdtZGwtdGV4dGZpZWxkX19pbnB1dCcsXG4gICAgSVNfRElSVFk6ICdpcy1kaXJ0eScsXG4gICAgSVNfRk9DVVNFRDogJ2lzLWZvY3VzZWQnLFxuICAgIElTX0RJU0FCTEVEOiAnaXMtZGlzYWJsZWQnLFxuICAgIElTX0lOVkFMSUQ6ICdpcy1pbnZhbGlkJyxcbiAgICBJU19VUEdSQURFRDogJ2lzLXVwZ3JhZGVkJyxcbiAgICBIQVNfUExBQ0VIT0xERVI6ICdoYXMtcGxhY2Vob2xkZXInXG59O1xuLyoqXG4gICAqIEhhbmRsZSBpbnB1dCBiZWluZyBlbnRlcmVkLlxuICAgKlxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudCBUaGUgZXZlbnQgdGhhdCBmaXJlZC5cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFRleHRmaWVsZC5wcm90b3R5cGUub25LZXlEb3duXyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHZhciBjdXJyZW50Um93Q291bnQgPSBldmVudC50YXJnZXQudmFsdWUuc3BsaXQoJ1xcbicpLmxlbmd0aDtcbiAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMpIHtcbiAgICAgICAgaWYgKGN1cnJlbnRSb3dDb3VudCA+PSB0aGlzLm1heFJvd3MpIHtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuLyoqXG4gICAqIEhhbmRsZSBmb2N1cy5cbiAgICpcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnQgVGhlIGV2ZW50IHRoYXQgZmlyZWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxUZXh0ZmllbGQucHJvdG90eXBlLm9uRm9jdXNfID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfRk9DVVNFRCk7XG59O1xuLyoqXG4gICAqIEhhbmRsZSBsb3N0IGZvY3VzLlxuICAgKlxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudCBUaGUgZXZlbnQgdGhhdCBmaXJlZC5cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFRleHRmaWVsZC5wcm90b3R5cGUub25CbHVyXyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LnJlbW92ZSh0aGlzLkNzc0NsYXNzZXNfLklTX0ZPQ1VTRUQpO1xufTtcbi8qKlxuICAgKiBIYW5kbGUgcmVzZXQgZXZlbnQgZnJvbSBvdXQgc2lkZS5cbiAgICpcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnQgVGhlIGV2ZW50IHRoYXQgZmlyZWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxUZXh0ZmllbGQucHJvdG90eXBlLm9uUmVzZXRfID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdGhpcy51cGRhdGVDbGFzc2VzXygpO1xufTtcbi8qKlxuICAgKiBIYW5kbGUgY2xhc3MgdXBkYXRlcy5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFRleHRmaWVsZC5wcm90b3R5cGUudXBkYXRlQ2xhc3Nlc18gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5jaGVja0Rpc2FibGVkKCk7XG4gICAgdGhpcy5jaGVja1ZhbGlkaXR5KCk7XG4gICAgdGhpcy5jaGVja0RpcnR5KCk7XG4gICAgdGhpcy5jaGVja0ZvY3VzKCk7XG59O1xuLy8gUHVibGljIG1ldGhvZHMuXG4vKipcbiAgICogQ2hlY2sgdGhlIGRpc2FibGVkIHN0YXRlIGFuZCB1cGRhdGUgZmllbGQgYWNjb3JkaW5nbHkuXG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICovXG5NYXRlcmlhbFRleHRmaWVsZC5wcm90b3R5cGUuY2hlY2tEaXNhYmxlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5pbnB1dF8uZGlzYWJsZWQpIHtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfRElTQUJMRUQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LnJlbW92ZSh0aGlzLkNzc0NsYXNzZXNfLklTX0RJU0FCTEVEKTtcbiAgICB9XG59O1xuTWF0ZXJpYWxUZXh0ZmllbGQucHJvdG90eXBlWydjaGVja0Rpc2FibGVkJ10gPSBNYXRlcmlhbFRleHRmaWVsZC5wcm90b3R5cGUuY2hlY2tEaXNhYmxlZDtcbi8qKlxuICAqIENoZWNrIHRoZSBmb2N1cyBzdGF0ZSBhbmQgdXBkYXRlIGZpZWxkIGFjY29yZGluZ2x5LlxuICAqXG4gICogQHB1YmxpY1xuICAqL1xuTWF0ZXJpYWxUZXh0ZmllbGQucHJvdG90eXBlLmNoZWNrRm9jdXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKEJvb2xlYW4odGhpcy5lbGVtZW50Xy5xdWVyeVNlbGVjdG9yKCc6Zm9jdXMnKSkpIHtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfRk9DVVNFRCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfRk9DVVNFRCk7XG4gICAgfVxufTtcbk1hdGVyaWFsVGV4dGZpZWxkLnByb3RvdHlwZVsnY2hlY2tGb2N1cyddID0gTWF0ZXJpYWxUZXh0ZmllbGQucHJvdG90eXBlLmNoZWNrRm9jdXM7XG4vKipcbiAgICogQ2hlY2sgdGhlIHZhbGlkaXR5IHN0YXRlIGFuZCB1cGRhdGUgZmllbGQgYWNjb3JkaW5nbHkuXG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICovXG5NYXRlcmlhbFRleHRmaWVsZC5wcm90b3R5cGUuY2hlY2tWYWxpZGl0eSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5pbnB1dF8udmFsaWRpdHkpIHtcbiAgICAgICAgaWYgKHRoaXMuaW5wdXRfLnZhbGlkaXR5LnZhbGlkKSB7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5yZW1vdmUodGhpcy5Dc3NDbGFzc2VzXy5JU19JTlZBTElEKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLklTX0lOVkFMSUQpO1xuICAgICAgICB9XG4gICAgfVxufTtcbk1hdGVyaWFsVGV4dGZpZWxkLnByb3RvdHlwZVsnY2hlY2tWYWxpZGl0eSddID0gTWF0ZXJpYWxUZXh0ZmllbGQucHJvdG90eXBlLmNoZWNrVmFsaWRpdHk7XG4vKipcbiAgICogQ2hlY2sgdGhlIGRpcnR5IHN0YXRlIGFuZCB1cGRhdGUgZmllbGQgYWNjb3JkaW5nbHkuXG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICovXG5NYXRlcmlhbFRleHRmaWVsZC5wcm90b3R5cGUuY2hlY2tEaXJ0eSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5pbnB1dF8udmFsdWUgJiYgdGhpcy5pbnB1dF8udmFsdWUubGVuZ3RoID4gMCkge1xuICAgICAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JU19ESVJUWSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfRElSVFkpO1xuICAgIH1cbn07XG5NYXRlcmlhbFRleHRmaWVsZC5wcm90b3R5cGVbJ2NoZWNrRGlydHknXSA9IE1hdGVyaWFsVGV4dGZpZWxkLnByb3RvdHlwZS5jaGVja0RpcnR5O1xuLyoqXG4gICAqIERpc2FibGUgdGV4dCBmaWVsZC5cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKi9cbk1hdGVyaWFsVGV4dGZpZWxkLnByb3RvdHlwZS5kaXNhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuaW5wdXRfLmRpc2FibGVkID0gdHJ1ZTtcbiAgICB0aGlzLnVwZGF0ZUNsYXNzZXNfKCk7XG59O1xuTWF0ZXJpYWxUZXh0ZmllbGQucHJvdG90eXBlWydkaXNhYmxlJ10gPSBNYXRlcmlhbFRleHRmaWVsZC5wcm90b3R5cGUuZGlzYWJsZTtcbi8qKlxuICAgKiBFbmFibGUgdGV4dCBmaWVsZC5cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKi9cbk1hdGVyaWFsVGV4dGZpZWxkLnByb3RvdHlwZS5lbmFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5pbnB1dF8uZGlzYWJsZWQgPSBmYWxzZTtcbiAgICB0aGlzLnVwZGF0ZUNsYXNzZXNfKCk7XG59O1xuTWF0ZXJpYWxUZXh0ZmllbGQucHJvdG90eXBlWydlbmFibGUnXSA9IE1hdGVyaWFsVGV4dGZpZWxkLnByb3RvdHlwZS5lbmFibGU7XG4vKipcbiAgICogVXBkYXRlIHRleHQgZmllbGQgdmFsdWUuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSBUaGUgdmFsdWUgdG8gd2hpY2ggdG8gc2V0IHRoZSBjb250cm9sIChvcHRpb25hbCkuXG4gICAqIEBwdWJsaWNcbiAgICovXG5NYXRlcmlhbFRleHRmaWVsZC5wcm90b3R5cGUuY2hhbmdlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdGhpcy5pbnB1dF8udmFsdWUgPSB2YWx1ZSB8fCAnJztcbiAgICB0aGlzLnVwZGF0ZUNsYXNzZXNfKCk7XG59O1xuTWF0ZXJpYWxUZXh0ZmllbGQucHJvdG90eXBlWydjaGFuZ2UnXSA9IE1hdGVyaWFsVGV4dGZpZWxkLnByb3RvdHlwZS5jaGFuZ2U7XG4vKipcbiAgICogSW5pdGlhbGl6ZSBlbGVtZW50LlxuICAgKi9cbk1hdGVyaWFsVGV4dGZpZWxkLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmVsZW1lbnRfKSB7XG4gICAgICAgIHRoaXMubGFiZWxfID0gdGhpcy5lbGVtZW50Xy5xdWVyeVNlbGVjdG9yKCcuJyArIHRoaXMuQ3NzQ2xhc3Nlc18uTEFCRUwpO1xuICAgICAgICB0aGlzLmlucHV0XyA9IHRoaXMuZWxlbWVudF8ucXVlcnlTZWxlY3RvcignLicgKyB0aGlzLkNzc0NsYXNzZXNfLklOUFVUKTtcbiAgICAgICAgaWYgKHRoaXMuaW5wdXRfKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5pbnB1dF8uaGFzQXR0cmlidXRlKHRoaXMuQ29uc3RhbnRfLk1BWF9ST1dTX0FUVFJJQlVURSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1heFJvd3MgPSBwYXJzZUludCh0aGlzLmlucHV0Xy5nZXRBdHRyaWJ1dGUodGhpcy5Db25zdGFudF8uTUFYX1JPV1NfQVRUUklCVVRFKSwgMTApO1xuICAgICAgICAgICAgICAgIGlmIChpc05hTih0aGlzLm1heFJvd3MpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubWF4Um93cyA9IHRoaXMuQ29uc3RhbnRfLk5PX01BWF9ST1dTO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLmlucHV0Xy5oYXNBdHRyaWJ1dGUoJ3BsYWNlaG9sZGVyJykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5IQVNfUExBQ0VIT0xERVIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5ib3VuZFVwZGF0ZUNsYXNzZXNIYW5kbGVyID0gdGhpcy51cGRhdGVDbGFzc2VzXy5iaW5kKHRoaXMpO1xuICAgICAgICAgICAgdGhpcy5ib3VuZEZvY3VzSGFuZGxlciA9IHRoaXMub25Gb2N1c18uYmluZCh0aGlzKTtcbiAgICAgICAgICAgIHRoaXMuYm91bmRCbHVySGFuZGxlciA9IHRoaXMub25CbHVyXy5iaW5kKHRoaXMpO1xuICAgICAgICAgICAgdGhpcy5ib3VuZFJlc2V0SGFuZGxlciA9IHRoaXMub25SZXNldF8uYmluZCh0aGlzKTtcbiAgICAgICAgICAgIHRoaXMuaW5wdXRfLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgdGhpcy5ib3VuZFVwZGF0ZUNsYXNzZXNIYW5kbGVyKTtcbiAgICAgICAgICAgIHRoaXMuaW5wdXRfLmFkZEV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgdGhpcy5ib3VuZEZvY3VzSGFuZGxlcik7XG4gICAgICAgICAgICB0aGlzLmlucHV0Xy5hZGRFdmVudExpc3RlbmVyKCdibHVyJywgdGhpcy5ib3VuZEJsdXJIYW5kbGVyKTtcbiAgICAgICAgICAgIHRoaXMuaW5wdXRfLmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2V0JywgdGhpcy5ib3VuZFJlc2V0SGFuZGxlcik7XG4gICAgICAgICAgICBpZiAodGhpcy5tYXhSb3dzICE9PSB0aGlzLkNvbnN0YW50Xy5OT19NQVhfUk9XUykge1xuICAgICAgICAgICAgICAgIC8vIFRPRE86IFRoaXMgc2hvdWxkIGhhbmRsZSBwYXN0aW5nIG11bHRpIGxpbmUgdGV4dC5cbiAgICAgICAgICAgICAgICAvLyBDdXJyZW50bHkgZG9lc24ndC5cbiAgICAgICAgICAgICAgICB0aGlzLmJvdW5kS2V5RG93bkhhbmRsZXIgPSB0aGlzLm9uS2V5RG93bl8uYmluZCh0aGlzKTtcbiAgICAgICAgICAgICAgICB0aGlzLmlucHV0Xy5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgdGhpcy5ib3VuZEtleURvd25IYW5kbGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBpbnZhbGlkID0gdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5JU19JTlZBTElEKTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlQ2xhc3Nlc18oKTtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLklTX1VQR1JBREVEKTtcbiAgICAgICAgICAgIGlmIChpbnZhbGlkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfSU5WQUxJRCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5pbnB1dF8uaGFzQXR0cmlidXRlKCdhdXRvZm9jdXMnKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZWxlbWVudF8uZm9jdXMoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNoZWNrRm9jdXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG4vLyBUaGUgY29tcG9uZW50IHJlZ2lzdGVycyBpdHNlbGYuIEl0IGNhbiBhc3N1bWUgY29tcG9uZW50SGFuZGxlciBpcyBhdmFpbGFibGVcbi8vIGluIHRoZSBnbG9iYWwgc2NvcGUuXG5jb21wb25lbnRIYW5kbGVyLnJlZ2lzdGVyKHtcbiAgICBjb25zdHJ1Y3RvcjogTWF0ZXJpYWxUZXh0ZmllbGQsXG4gICAgY2xhc3NBc1N0cmluZzogJ01hdGVyaWFsVGV4dGZpZWxkJyxcbiAgICBjc3NDbGFzczogJ21kbC1qcy10ZXh0ZmllbGQnLFxuICAgIHdpZGdldDogdHJ1ZVxufSk7XG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNSBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICAgKiBDbGFzcyBjb25zdHJ1Y3RvciBmb3IgVG9vbHRpcCBNREwgY29tcG9uZW50LlxuICAgKiBJbXBsZW1lbnRzIE1ETCBjb21wb25lbnQgZGVzaWduIHBhdHRlcm4gZGVmaW5lZCBhdDpcbiAgICogaHR0cHM6Ly9naXRodWIuY29tL2phc29ubWF5ZXMvbWRsLWNvbXBvbmVudC1kZXNpZ24tcGF0dGVyblxuICAgKlxuICAgKiBAY29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxlbWVudCBUaGUgZWxlbWVudCB0aGF0IHdpbGwgYmUgdXBncmFkZWQuXG4gICAqL1xudmFyIE1hdGVyaWFsVG9vbHRpcCA9IGZ1bmN0aW9uIE1hdGVyaWFsVG9vbHRpcChlbGVtZW50KSB7XG4gICAgdGhpcy5lbGVtZW50XyA9IGVsZW1lbnQ7XG4gICAgLy8gSW5pdGlhbGl6ZSBpbnN0YW5jZS5cbiAgICB0aGlzLmluaXQoKTtcbn07XG53aW5kb3dbJ01hdGVyaWFsVG9vbHRpcCddID0gTWF0ZXJpYWxUb29sdGlwO1xuLyoqXG4gICAqIFN0b3JlIGNvbnN0YW50cyBpbiBvbmUgcGxhY2Ugc28gdGhleSBjYW4gYmUgdXBkYXRlZCBlYXNpbHkuXG4gICAqXG4gICAqIEBlbnVtIHtzdHJpbmcgfCBudW1iZXJ9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxUb29sdGlwLnByb3RvdHlwZS5Db25zdGFudF8gPSB7fTtcbi8qKlxuICAgKiBTdG9yZSBzdHJpbmdzIGZvciBjbGFzcyBuYW1lcyBkZWZpbmVkIGJ5IHRoaXMgY29tcG9uZW50IHRoYXQgYXJlIHVzZWQgaW5cbiAgICogSmF2YVNjcmlwdC4gVGhpcyBhbGxvd3MgdXMgdG8gc2ltcGx5IGNoYW5nZSBpdCBpbiBvbmUgcGxhY2Ugc2hvdWxkIHdlXG4gICAqIGRlY2lkZSB0byBtb2RpZnkgYXQgYSBsYXRlciBkYXRlLlxuICAgKlxuICAgKiBAZW51bSB7c3RyaW5nfVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsVG9vbHRpcC5wcm90b3R5cGUuQ3NzQ2xhc3Nlc18gPSB7XG4gICAgSVNfQUNUSVZFOiAnaXMtYWN0aXZlJyxcbiAgICBCT1RUT006ICdtZGwtdG9vbHRpcC0tYm90dG9tJyxcbiAgICBMRUZUOiAnbWRsLXRvb2x0aXAtLWxlZnQnLFxuICAgIFJJR0hUOiAnbWRsLXRvb2x0aXAtLXJpZ2h0JyxcbiAgICBUT1A6ICdtZGwtdG9vbHRpcC0tdG9wJ1xufTtcbi8qKlxuICAgKiBIYW5kbGUgbW91c2VlbnRlciBmb3IgdG9vbHRpcC5cbiAgICpcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnQgVGhlIGV2ZW50IHRoYXQgZmlyZWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxUb29sdGlwLnByb3RvdHlwZS5oYW5kbGVNb3VzZUVudGVyXyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHZhciBwcm9wcyA9IGV2ZW50LnRhcmdldC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICB2YXIgbGVmdCA9IHByb3BzLmxlZnQgKyBwcm9wcy53aWR0aCAvIDI7XG4gICAgdmFyIHRvcCA9IHByb3BzLnRvcCArIHByb3BzLmhlaWdodCAvIDI7XG4gICAgdmFyIG1hcmdpbkxlZnQgPSAtMSAqICh0aGlzLmVsZW1lbnRfLm9mZnNldFdpZHRoIC8gMik7XG4gICAgdmFyIG1hcmdpblRvcCA9IC0xICogKHRoaXMuZWxlbWVudF8ub2Zmc2V0SGVpZ2h0IC8gMik7XG4gICAgaWYgKHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uTEVGVCkgfHwgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5SSUdIVCkpIHtcbiAgICAgICAgbGVmdCA9IHByb3BzLndpZHRoIC8gMjtcbiAgICAgICAgaWYgKHRvcCArIG1hcmdpblRvcCA8IDApIHtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudF8uc3R5bGUudG9wID0gMDtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudF8uc3R5bGUubWFyZ2luVG9wID0gMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudF8uc3R5bGUudG9wID0gdG9wICsgJ3B4JztcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudF8uc3R5bGUubWFyZ2luVG9wID0gbWFyZ2luVG9wICsgJ3B4JztcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChsZWZ0ICsgbWFyZ2luTGVmdCA8IDApIHtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudF8uc3R5bGUubGVmdCA9IDA7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRfLnN0eWxlLm1hcmdpbkxlZnQgPSAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50Xy5zdHlsZS5sZWZ0ID0gbGVmdCArICdweCc7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRfLnN0eWxlLm1hcmdpbkxlZnQgPSBtYXJnaW5MZWZ0ICsgJ3B4JztcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAodGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5UT1ApKSB7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uc3R5bGUudG9wID0gcHJvcHMudG9wIC0gdGhpcy5lbGVtZW50Xy5vZmZzZXRIZWlnaHQgLSAxMCArICdweCc7XG4gICAgfSBlbHNlIGlmICh0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLlJJR0hUKSkge1xuICAgICAgICB0aGlzLmVsZW1lbnRfLnN0eWxlLmxlZnQgPSBwcm9wcy5sZWZ0ICsgcHJvcHMud2lkdGggKyAxMCArICdweCc7XG4gICAgfSBlbHNlIGlmICh0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLkxFRlQpKSB7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uc3R5bGUubGVmdCA9IHByb3BzLmxlZnQgLSB0aGlzLmVsZW1lbnRfLm9mZnNldFdpZHRoIC0gMTAgKyAncHgnO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uc3R5bGUudG9wID0gcHJvcHMudG9wICsgcHJvcHMuaGVpZ2h0ICsgMTAgKyAncHgnO1xuICAgIH1cbiAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JU19BQ1RJVkUpO1xufTtcbi8qKlxuICAgKiBIYW5kbGUgbW91c2VsZWF2ZSBmb3IgdG9vbHRpcC5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFRvb2x0aXAucHJvdG90eXBlLmhhbmRsZU1vdXNlTGVhdmVfID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LnJlbW92ZSh0aGlzLkNzc0NsYXNzZXNfLklTX0FDVElWRSk7XG59O1xuLyoqXG4gICAqIEluaXRpYWxpemUgZWxlbWVudC5cbiAgICovXG5NYXRlcmlhbFRvb2x0aXAucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuZWxlbWVudF8pIHtcbiAgICAgICAgdmFyIGZvckVsSWQgPSB0aGlzLmVsZW1lbnRfLmdldEF0dHJpYnV0ZSgnZm9yJyk7XG4gICAgICAgIGlmIChmb3JFbElkKSB7XG4gICAgICAgICAgICB0aGlzLmZvckVsZW1lbnRfID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZm9yRWxJZCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuZm9yRWxlbWVudF8pIHtcbiAgICAgICAgICAgIC8vIEl0J3MgbGVmdCBoZXJlIGJlY2F1c2UgaXQgcHJldmVudHMgYWNjaWRlbnRhbCB0ZXh0IHNlbGVjdGlvbiBvbiBBbmRyb2lkXG4gICAgICAgICAgICBpZiAoIXRoaXMuZm9yRWxlbWVudF8uaGFzQXR0cmlidXRlKCd0YWJpbmRleCcpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5mb3JFbGVtZW50Xy5zZXRBdHRyaWJ1dGUoJ3RhYmluZGV4JywgJzAnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuYm91bmRNb3VzZUVudGVySGFuZGxlciA9IHRoaXMuaGFuZGxlTW91c2VFbnRlcl8uYmluZCh0aGlzKTtcbiAgICAgICAgICAgIHRoaXMuYm91bmRNb3VzZUxlYXZlSGFuZGxlciA9IHRoaXMuaGFuZGxlTW91c2VMZWF2ZV8uYmluZCh0aGlzKTtcbiAgICAgICAgICAgIHRoaXMuZm9yRWxlbWVudF8uYWRkRXZlbnRMaXN0ZW5lcignbW91c2VlbnRlcicsIHRoaXMuYm91bmRNb3VzZUVudGVySGFuZGxlciwgZmFsc2UpO1xuICAgICAgICAgICAgdGhpcy5mb3JFbGVtZW50Xy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIHRoaXMuYm91bmRNb3VzZUVudGVySGFuZGxlciwgZmFsc2UpO1xuICAgICAgICAgICAgdGhpcy5mb3JFbGVtZW50Xy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWxlYXZlJywgdGhpcy5ib3VuZE1vdXNlTGVhdmVIYW5kbGVyLCBmYWxzZSk7XG4gICAgICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIHRoaXMuYm91bmRNb3VzZUxlYXZlSGFuZGxlcik7XG4gICAgICAgIH1cbiAgICB9XG59O1xuLy8gVGhlIGNvbXBvbmVudCByZWdpc3RlcnMgaXRzZWxmLiBJdCBjYW4gYXNzdW1lIGNvbXBvbmVudEhhbmRsZXIgaXMgYXZhaWxhYmxlXG4vLyBpbiB0aGUgZ2xvYmFsIHNjb3BlLlxuY29tcG9uZW50SGFuZGxlci5yZWdpc3Rlcih7XG4gICAgY29uc3RydWN0b3I6IE1hdGVyaWFsVG9vbHRpcCxcbiAgICBjbGFzc0FzU3RyaW5nOiAnTWF0ZXJpYWxUb29sdGlwJyxcbiAgICBjc3NDbGFzczogJ21kbC10b29sdGlwJ1xufSk7XG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNSBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICAgKiBDbGFzcyBjb25zdHJ1Y3RvciBmb3IgTGF5b3V0IE1ETCBjb21wb25lbnQuXG4gICAqIEltcGxlbWVudHMgTURMIGNvbXBvbmVudCBkZXNpZ24gcGF0dGVybiBkZWZpbmVkIGF0OlxuICAgKiBodHRwczovL2dpdGh1Yi5jb20vamFzb25tYXllcy9tZGwtY29tcG9uZW50LWRlc2lnbi1wYXR0ZXJuXG4gICAqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbGVtZW50IFRoZSBlbGVtZW50IHRoYXQgd2lsbCBiZSB1cGdyYWRlZC5cbiAgICovXG52YXIgTWF0ZXJpYWxMYXlvdXQgPSBmdW5jdGlvbiBNYXRlcmlhbExheW91dChlbGVtZW50KSB7XG4gICAgdGhpcy5lbGVtZW50XyA9IGVsZW1lbnQ7XG4gICAgLy8gSW5pdGlhbGl6ZSBpbnN0YW5jZS5cbiAgICB0aGlzLmluaXQoKTtcbn07XG53aW5kb3dbJ01hdGVyaWFsTGF5b3V0J10gPSBNYXRlcmlhbExheW91dDtcbi8qKlxuICAgKiBTdG9yZSBjb25zdGFudHMgaW4gb25lIHBsYWNlIHNvIHRoZXkgY2FuIGJlIHVwZGF0ZWQgZWFzaWx5LlxuICAgKlxuICAgKiBAZW51bSB7c3RyaW5nIHwgbnVtYmVyfVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsTGF5b3V0LnByb3RvdHlwZS5Db25zdGFudF8gPSB7XG4gICAgTUFYX1dJRFRIOiAnKG1heC13aWR0aDogMTAyNHB4KScsXG4gICAgVEFCX1NDUk9MTF9QSVhFTFM6IDEwMCxcbiAgICBSRVNJWkVfVElNRU9VVDogMTAwLFxuICAgIE1FTlVfSUNPTjogJ21lbnUnLFxuICAgIENIRVZST05fTEVGVDogJ2NoZXZyb25fbGVmdCcsXG4gICAgQ0hFVlJPTl9SSUdIVDogJ2NoZXZyb25fcmlnaHQnXG59O1xuLyoqXG4gICAqIEtleWNvZGVzLCBmb3IgY29kZSByZWFkYWJpbGl0eS5cbiAgICpcbiAgICogQGVudW0ge251bWJlcn1cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbExheW91dC5wcm90b3R5cGUuS2V5Y29kZXNfID0ge1xuICAgIEVOVEVSOiAxMyxcbiAgICBFU0NBUEU6IDI3LFxuICAgIFNQQUNFOiAzMlxufTtcbi8qKlxuICAgKiBNb2Rlcy5cbiAgICpcbiAgICogQGVudW0ge251bWJlcn1cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbExheW91dC5wcm90b3R5cGUuTW9kZV8gPSB7XG4gICAgU1RBTkRBUkQ6IDAsXG4gICAgU0VBTUVEOiAxLFxuICAgIFdBVEVSRkFMTDogMixcbiAgICBTQ1JPTEw6IDNcbn07XG4vKipcbiAgICogU3RvcmUgc3RyaW5ncyBmb3IgY2xhc3MgbmFtZXMgZGVmaW5lZCBieSB0aGlzIGNvbXBvbmVudCB0aGF0IGFyZSB1c2VkIGluXG4gICAqIEphdmFTY3JpcHQuIFRoaXMgYWxsb3dzIHVzIHRvIHNpbXBseSBjaGFuZ2UgaXQgaW4gb25lIHBsYWNlIHNob3VsZCB3ZVxuICAgKiBkZWNpZGUgdG8gbW9kaWZ5IGF0IGEgbGF0ZXIgZGF0ZS5cbiAgICpcbiAgICogQGVudW0ge3N0cmluZ31cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbExheW91dC5wcm90b3R5cGUuQ3NzQ2xhc3Nlc18gPSB7XG4gICAgQ09OVEFJTkVSOiAnbWRsLWxheW91dF9fY29udGFpbmVyJyxcbiAgICBIRUFERVI6ICdtZGwtbGF5b3V0X19oZWFkZXInLFxuICAgIERSQVdFUjogJ21kbC1sYXlvdXRfX2RyYXdlcicsXG4gICAgQ09OVEVOVDogJ21kbC1sYXlvdXRfX2NvbnRlbnQnLFxuICAgIERSQVdFUl9CVE46ICdtZGwtbGF5b3V0X19kcmF3ZXItYnV0dG9uJyxcbiAgICBJQ09OOiAnbWF0ZXJpYWwtaWNvbnMnLFxuICAgIEpTX1JJUFBMRV9FRkZFQ1Q6ICdtZGwtanMtcmlwcGxlLWVmZmVjdCcsXG4gICAgUklQUExFX0NPTlRBSU5FUjogJ21kbC1sYXlvdXRfX3RhYi1yaXBwbGUtY29udGFpbmVyJyxcbiAgICBSSVBQTEU6ICdtZGwtcmlwcGxlJyxcbiAgICBSSVBQTEVfSUdOT1JFX0VWRU5UUzogJ21kbC1qcy1yaXBwbGUtZWZmZWN0LS1pZ25vcmUtZXZlbnRzJyxcbiAgICBIRUFERVJfU0VBTUVEOiAnbWRsLWxheW91dF9faGVhZGVyLS1zZWFtZWQnLFxuICAgIEhFQURFUl9XQVRFUkZBTEw6ICdtZGwtbGF5b3V0X19oZWFkZXItLXdhdGVyZmFsbCcsXG4gICAgSEVBREVSX1NDUk9MTDogJ21kbC1sYXlvdXRfX2hlYWRlci0tc2Nyb2xsJyxcbiAgICBGSVhFRF9IRUFERVI6ICdtZGwtbGF5b3V0LS1maXhlZC1oZWFkZXInLFxuICAgIE9CRlVTQ0FUT1I6ICdtZGwtbGF5b3V0X19vYmZ1c2NhdG9yJyxcbiAgICBUQUJfQkFSOiAnbWRsLWxheW91dF9fdGFiLWJhcicsXG4gICAgVEFCX0NPTlRBSU5FUjogJ21kbC1sYXlvdXRfX3RhYi1iYXItY29udGFpbmVyJyxcbiAgICBUQUI6ICdtZGwtbGF5b3V0X190YWInLFxuICAgIFRBQl9CQVJfQlVUVE9OOiAnbWRsLWxheW91dF9fdGFiLWJhci1idXR0b24nLFxuICAgIFRBQl9CQVJfTEVGVF9CVVRUT046ICdtZGwtbGF5b3V0X190YWItYmFyLWxlZnQtYnV0dG9uJyxcbiAgICBUQUJfQkFSX1JJR0hUX0JVVFRPTjogJ21kbC1sYXlvdXRfX3RhYi1iYXItcmlnaHQtYnV0dG9uJyxcbiAgICBQQU5FTDogJ21kbC1sYXlvdXRfX3RhYi1wYW5lbCcsXG4gICAgSEFTX0RSQVdFUjogJ2hhcy1kcmF3ZXInLFxuICAgIEhBU19UQUJTOiAnaGFzLXRhYnMnLFxuICAgIEhBU19TQ1JPTExJTkdfSEVBREVSOiAnaGFzLXNjcm9sbGluZy1oZWFkZXInLFxuICAgIENBU1RJTkdfU0hBRE9XOiAnaXMtY2FzdGluZy1zaGFkb3cnLFxuICAgIElTX0NPTVBBQ1Q6ICdpcy1jb21wYWN0JyxcbiAgICBJU19TTUFMTF9TQ1JFRU46ICdpcy1zbWFsbC1zY3JlZW4nLFxuICAgIElTX0RSQVdFUl9PUEVOOiAnaXMtdmlzaWJsZScsXG4gICAgSVNfQUNUSVZFOiAnaXMtYWN0aXZlJyxcbiAgICBJU19VUEdSQURFRDogJ2lzLXVwZ3JhZGVkJyxcbiAgICBJU19BTklNQVRJTkc6ICdpcy1hbmltYXRpbmcnLFxuICAgIE9OX0xBUkdFX1NDUkVFTjogJ21kbC1sYXlvdXQtLWxhcmdlLXNjcmVlbi1vbmx5JyxcbiAgICBPTl9TTUFMTF9TQ1JFRU46ICdtZGwtbGF5b3V0LS1zbWFsbC1zY3JlZW4tb25seSdcbn07XG4vKipcbiAgICogSGFuZGxlcyBzY3JvbGxpbmcgb24gdGhlIGNvbnRlbnQuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxMYXlvdXQucHJvdG90eXBlLmNvbnRlbnRTY3JvbGxIYW5kbGVyXyA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5oZWFkZXJfLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLklTX0FOSU1BVElORykpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgaGVhZGVyVmlzaWJsZSA9ICF0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLklTX1NNQUxMX1NDUkVFTikgfHwgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5GSVhFRF9IRUFERVIpO1xuICAgIGlmICh0aGlzLmNvbnRlbnRfLnNjcm9sbFRvcCA+IDAgJiYgIXRoaXMuaGVhZGVyXy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5JU19DT01QQUNUKSkge1xuICAgICAgICB0aGlzLmhlYWRlcl8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLkNBU1RJTkdfU0hBRE9XKTtcbiAgICAgICAgdGhpcy5oZWFkZXJfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JU19DT01QQUNUKTtcbiAgICAgICAgaWYgKGhlYWRlclZpc2libGUpIHtcbiAgICAgICAgICAgIHRoaXMuaGVhZGVyXy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfQU5JTUFUSU5HKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAodGhpcy5jb250ZW50Xy5zY3JvbGxUb3AgPD0gMCAmJiB0aGlzLmhlYWRlcl8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfQ09NUEFDVCkpIHtcbiAgICAgICAgdGhpcy5oZWFkZXJfLmNsYXNzTGlzdC5yZW1vdmUodGhpcy5Dc3NDbGFzc2VzXy5DQVNUSU5HX1NIQURPVyk7XG4gICAgICAgIHRoaXMuaGVhZGVyXy5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfQ09NUEFDVCk7XG4gICAgICAgIGlmIChoZWFkZXJWaXNpYmxlKSB7XG4gICAgICAgICAgICB0aGlzLmhlYWRlcl8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLklTX0FOSU1BVElORyk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuLyoqXG4gICAqIEhhbmRsZXMgYSBrZXlib2FyZCBldmVudCBvbiB0aGUgZHJhd2VyLlxuICAgKlxuICAgKiBAcGFyYW0ge0V2ZW50fSBldnQgVGhlIGV2ZW50IHRoYXQgZmlyZWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxMYXlvdXQucHJvdG90eXBlLmtleWJvYXJkRXZlbnRIYW5kbGVyXyA9IGZ1bmN0aW9uIChldnQpIHtcbiAgICAvLyBPbmx5IHJlYWN0IHdoZW4gdGhlIGRyYXdlciBpcyBvcGVuLlxuICAgIGlmIChldnQua2V5Q29kZSA9PT0gdGhpcy5LZXljb2Rlc18uRVNDQVBFICYmIHRoaXMuZHJhd2VyXy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5JU19EUkFXRVJfT1BFTikpIHtcbiAgICAgICAgdGhpcy50b2dnbGVEcmF3ZXIoKTtcbiAgICB9XG59O1xuLyoqXG4gICAqIEhhbmRsZXMgY2hhbmdlcyBpbiBzY3JlZW4gc2l6ZS5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbExheW91dC5wcm90b3R5cGUuc2NyZWVuU2l6ZUhhbmRsZXJfID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLnNjcmVlblNpemVNZWRpYVF1ZXJ5Xy5tYXRjaGVzKSB7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLklTX1NNQUxMX1NDUkVFTik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfU01BTExfU0NSRUVOKTtcbiAgICAgICAgLy8gQ29sbGFwc2UgZHJhd2VyIChpZiBhbnkpIHdoZW4gbW92aW5nIHRvIGEgbGFyZ2Ugc2NyZWVuIHNpemUuXG4gICAgICAgIGlmICh0aGlzLmRyYXdlcl8pIHtcbiAgICAgICAgICAgIHRoaXMuZHJhd2VyXy5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfRFJBV0VSX09QRU4pO1xuICAgICAgICAgICAgdGhpcy5vYmZ1c2NhdG9yXy5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfRFJBV0VSX09QRU4pO1xuICAgICAgICB9XG4gICAgfVxufTtcbi8qKlxuICAgKiBIYW5kbGVzIGV2ZW50cyBvZiBkcmF3ZXIgYnV0dG9uLlxuICAgKlxuICAgKiBAcGFyYW0ge0V2ZW50fSBldnQgVGhlIGV2ZW50IHRoYXQgZmlyZWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxMYXlvdXQucHJvdG90eXBlLmRyYXdlclRvZ2dsZUhhbmRsZXJfID0gZnVuY3Rpb24gKGV2dCkge1xuICAgIGlmIChldnQgJiYgZXZ0LnR5cGUgPT09ICdrZXlkb3duJykge1xuICAgICAgICBpZiAoZXZ0LmtleUNvZGUgPT09IHRoaXMuS2V5Y29kZXNfLlNQQUNFIHx8IGV2dC5rZXlDb2RlID09PSB0aGlzLktleWNvZGVzXy5FTlRFUikge1xuICAgICAgICAgICAgLy8gcHJldmVudCBzY3JvbGxpbmcgaW4gZHJhd2VyIG5hdlxuICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBwcmV2ZW50IG90aGVyIGtleXNcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnRvZ2dsZURyYXdlcigpO1xufTtcbi8qKlxuICAgKiBIYW5kbGVzICh1bilzZXR0aW5nIHRoZSBgaXMtYW5pbWF0aW5nYCBjbGFzc1xuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsTGF5b3V0LnByb3RvdHlwZS5oZWFkZXJUcmFuc2l0aW9uRW5kSGFuZGxlcl8gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5oZWFkZXJfLmNsYXNzTGlzdC5yZW1vdmUodGhpcy5Dc3NDbGFzc2VzXy5JU19BTklNQVRJTkcpO1xufTtcbi8qKlxuICAgKiBIYW5kbGVzIGV4cGFuZGluZyB0aGUgaGVhZGVyIG9uIGNsaWNrXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxMYXlvdXQucHJvdG90eXBlLmhlYWRlckNsaWNrSGFuZGxlcl8gPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuaGVhZGVyXy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5JU19DT01QQUNUKSkge1xuICAgICAgICB0aGlzLmhlYWRlcl8uY2xhc3NMaXN0LnJlbW92ZSh0aGlzLkNzc0NsYXNzZXNfLklTX0NPTVBBQ1QpO1xuICAgICAgICB0aGlzLmhlYWRlcl8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLklTX0FOSU1BVElORyk7XG4gICAgfVxufTtcbi8qKlxuICAgKiBSZXNldCB0YWIgc3RhdGUsIGRyb3BwaW5nIGFjdGl2ZSBjbGFzc2VzXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxMYXlvdXQucHJvdG90eXBlLnJlc2V0VGFiU3RhdGVfID0gZnVuY3Rpb24gKHRhYkJhcikge1xuICAgIGZvciAodmFyIGsgPSAwOyBrIDwgdGFiQmFyLmxlbmd0aDsgaysrKSB7XG4gICAgICAgIHRhYkJhcltrXS5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfQUNUSVZFKTtcbiAgICB9XG59O1xuLyoqXG4gICAqIFJlc2V0IHBhbmVsIHN0YXRlLCBkcm9waW5nIGFjdGl2ZSBjbGFzc2VzXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxMYXlvdXQucHJvdG90eXBlLnJlc2V0UGFuZWxTdGF0ZV8gPSBmdW5jdGlvbiAocGFuZWxzKSB7XG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCBwYW5lbHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgcGFuZWxzW2pdLmNsYXNzTGlzdC5yZW1vdmUodGhpcy5Dc3NDbGFzc2VzXy5JU19BQ1RJVkUpO1xuICAgIH1cbn07XG4vKipcbiAgKiBUb2dnbGUgZHJhd2VyIHN0YXRlXG4gICpcbiAgKiBAcHVibGljXG4gICovXG5NYXRlcmlhbExheW91dC5wcm90b3R5cGUudG9nZ2xlRHJhd2VyID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBkcmF3ZXJCdXR0b24gPSB0aGlzLmVsZW1lbnRfLnF1ZXJ5U2VsZWN0b3IoJy4nICsgdGhpcy5Dc3NDbGFzc2VzXy5EUkFXRVJfQlROKTtcbiAgICB0aGlzLmRyYXdlcl8uY2xhc3NMaXN0LnRvZ2dsZSh0aGlzLkNzc0NsYXNzZXNfLklTX0RSQVdFUl9PUEVOKTtcbiAgICB0aGlzLm9iZnVzY2F0b3JfLmNsYXNzTGlzdC50b2dnbGUodGhpcy5Dc3NDbGFzc2VzXy5JU19EUkFXRVJfT1BFTik7XG4gICAgLy8gU2V0IGFjY2Vzc2liaWxpdHkgcHJvcGVydGllcy5cbiAgICBpZiAodGhpcy5kcmF3ZXJfLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLklTX0RSQVdFUl9PUEVOKSkge1xuICAgICAgICB0aGlzLmRyYXdlcl8uc2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicsICdmYWxzZScpO1xuICAgICAgICBkcmF3ZXJCdXR0b24uc2V0QXR0cmlidXRlKCdhcmlhLWV4cGFuZGVkJywgJ3RydWUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmRyYXdlcl8uc2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicsICd0cnVlJyk7XG4gICAgICAgIGRyYXdlckJ1dHRvbi5zZXRBdHRyaWJ1dGUoJ2FyaWEtZXhwYW5kZWQnLCAnZmFsc2UnKTtcbiAgICB9XG59O1xuTWF0ZXJpYWxMYXlvdXQucHJvdG90eXBlWyd0b2dnbGVEcmF3ZXInXSA9IE1hdGVyaWFsTGF5b3V0LnByb3RvdHlwZS50b2dnbGVEcmF3ZXI7XG4vKipcbiAgICogSW5pdGlhbGl6ZSBlbGVtZW50LlxuICAgKi9cbk1hdGVyaWFsTGF5b3V0LnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmVsZW1lbnRfKSB7XG4gICAgICAgIHZhciBjb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgY29udGFpbmVyLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5DT05UQUlORVIpO1xuICAgICAgICB2YXIgZm9jdXNlZEVsZW1lbnQgPSB0aGlzLmVsZW1lbnRfLnF1ZXJ5U2VsZWN0b3IoJzpmb2N1cycpO1xuICAgICAgICB0aGlzLmVsZW1lbnRfLnBhcmVudEVsZW1lbnQuaW5zZXJ0QmVmb3JlKGNvbnRhaW5lciwgdGhpcy5lbGVtZW50Xyk7XG4gICAgICAgIHRoaXMuZWxlbWVudF8ucGFyZW50RWxlbWVudC5yZW1vdmVDaGlsZCh0aGlzLmVsZW1lbnRfKTtcbiAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHRoaXMuZWxlbWVudF8pO1xuICAgICAgICBpZiAoZm9jdXNlZEVsZW1lbnQpIHtcbiAgICAgICAgICAgIGZvY3VzZWRFbGVtZW50LmZvY3VzKCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGRpcmVjdENoaWxkcmVuID0gdGhpcy5lbGVtZW50Xy5jaGlsZE5vZGVzO1xuICAgICAgICB2YXIgbnVtQ2hpbGRyZW4gPSBkaXJlY3RDaGlsZHJlbi5sZW5ndGg7XG4gICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgbnVtQ2hpbGRyZW47IGMrKykge1xuICAgICAgICAgICAgdmFyIGNoaWxkID0gZGlyZWN0Q2hpbGRyZW5bY107XG4gICAgICAgICAgICBpZiAoY2hpbGQuY2xhc3NMaXN0ICYmIGNoaWxkLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLkhFQURFUikpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmhlYWRlcl8gPSBjaGlsZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjaGlsZC5jbGFzc0xpc3QgJiYgY2hpbGQuY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uRFJBV0VSKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZHJhd2VyXyA9IGNoaWxkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNoaWxkLmNsYXNzTGlzdCAmJiBjaGlsZC5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5DT05URU5UKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY29udGVudF8gPSBjaGlsZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncGFnZXNob3cnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgaWYgKGUucGVyc2lzdGVkKSB7XG4gICAgICAgICAgICAgICAgLy8gd2hlbiBwYWdlIGlzIGxvYWRlZCBmcm9tIGJhY2svZm9yd2FyZCBjYWNoZVxuICAgICAgICAgICAgICAgIC8vIHRyaWdnZXIgcmVwYWludCB0byBsZXQgbGF5b3V0IHNjcm9sbCBpbiBzYWZhcmlcbiAgICAgICAgICAgICAgICB0aGlzLmVsZW1lbnRfLnN0eWxlLm92ZXJmbG93WSA9ICdoaWRkZW4nO1xuICAgICAgICAgICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZWxlbWVudF8uc3R5bGUub3ZlcmZsb3dZID0gJyc7XG4gICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfS5iaW5kKHRoaXMpLCBmYWxzZSk7XG4gICAgICAgIGlmICh0aGlzLmhlYWRlcl8pIHtcbiAgICAgICAgICAgIHRoaXMudGFiQmFyXyA9IHRoaXMuaGVhZGVyXy5xdWVyeVNlbGVjdG9yKCcuJyArIHRoaXMuQ3NzQ2xhc3Nlc18uVEFCX0JBUik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG1vZGUgPSB0aGlzLk1vZGVfLlNUQU5EQVJEO1xuICAgICAgICBpZiAodGhpcy5oZWFkZXJfKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5oZWFkZXJfLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLkhFQURFUl9TRUFNRUQpKSB7XG4gICAgICAgICAgICAgICAgbW9kZSA9IHRoaXMuTW9kZV8uU0VBTUVEO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmhlYWRlcl8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uSEVBREVSX1dBVEVSRkFMTCkpIHtcbiAgICAgICAgICAgICAgICBtb2RlID0gdGhpcy5Nb2RlXy5XQVRFUkZBTEw7XG4gICAgICAgICAgICAgICAgdGhpcy5oZWFkZXJfLmFkZEV2ZW50TGlzdGVuZXIoJ3RyYW5zaXRpb25lbmQnLCB0aGlzLmhlYWRlclRyYW5zaXRpb25FbmRIYW5kbGVyXy5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgICAgICB0aGlzLmhlYWRlcl8uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmhlYWRlckNsaWNrSGFuZGxlcl8uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaGVhZGVyXy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5IRUFERVJfU0NST0xMKSkge1xuICAgICAgICAgICAgICAgIG1vZGUgPSB0aGlzLk1vZGVfLlNDUk9MTDtcbiAgICAgICAgICAgICAgICBjb250YWluZXIuY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLkhBU19TQ1JPTExJTkdfSEVBREVSKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtb2RlID09PSB0aGlzLk1vZGVfLlNUQU5EQVJEKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5oZWFkZXJfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5DQVNUSU5HX1NIQURPVyk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudGFiQmFyXykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRhYkJhcl8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLkNBU1RJTkdfU0hBRE9XKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1vZGUgPT09IHRoaXMuTW9kZV8uU0VBTUVEIHx8IG1vZGUgPT09IHRoaXMuTW9kZV8uU0NST0xMKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5oZWFkZXJfLmNsYXNzTGlzdC5yZW1vdmUodGhpcy5Dc3NDbGFzc2VzXy5DQVNUSU5HX1NIQURPVyk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudGFiQmFyXykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRhYkJhcl8uY2xhc3NMaXN0LnJlbW92ZSh0aGlzLkNzc0NsYXNzZXNfLkNBU1RJTkdfU0hBRE9XKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1vZGUgPT09IHRoaXMuTW9kZV8uV0FURVJGQUxMKSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIGFuZCByZW1vdmUgc2hhZG93cyBkZXBlbmRpbmcgb24gc2Nyb2xsIHBvc2l0aW9uLlxuICAgICAgICAgICAgICAgIC8vIEFsc28gYWRkL3JlbW92ZSBhdXhpbGlhcnkgY2xhc3MgZm9yIHN0eWxpbmcgb2YgdGhlIGNvbXBhY3QgdmVyc2lvbiBvZlxuICAgICAgICAgICAgICAgIC8vIHRoZSBoZWFkZXIuXG4gICAgICAgICAgICAgICAgdGhpcy5jb250ZW50Xy5hZGRFdmVudExpc3RlbmVyKCdzY3JvbGwnLCB0aGlzLmNvbnRlbnRTY3JvbGxIYW5kbGVyXy5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnRlbnRTY3JvbGxIYW5kbGVyXygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIEFkZCBkcmF3ZXIgdG9nZ2xpbmcgYnV0dG9uIHRvIG91ciBsYXlvdXQsIGlmIHdlIGhhdmUgYW4gb3BlbmFibGUgZHJhd2VyLlxuICAgICAgICBpZiAodGhpcy5kcmF3ZXJfKSB7XG4gICAgICAgICAgICB2YXIgZHJhd2VyQnV0dG9uID0gdGhpcy5lbGVtZW50Xy5xdWVyeVNlbGVjdG9yKCcuJyArIHRoaXMuQ3NzQ2xhc3Nlc18uRFJBV0VSX0JUTik7XG4gICAgICAgICAgICBpZiAoIWRyYXdlckJ1dHRvbikge1xuICAgICAgICAgICAgICAgIGRyYXdlckJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgICAgIGRyYXdlckJ1dHRvbi5zZXRBdHRyaWJ1dGUoJ2FyaWEtZXhwYW5kZWQnLCAnZmFsc2UnKTtcbiAgICAgICAgICAgICAgICBkcmF3ZXJCdXR0b24uc2V0QXR0cmlidXRlKCdyb2xlJywgJ2J1dHRvbicpO1xuICAgICAgICAgICAgICAgIGRyYXdlckJ1dHRvbi5zZXRBdHRyaWJ1dGUoJ3RhYmluZGV4JywgJzAnKTtcbiAgICAgICAgICAgICAgICBkcmF3ZXJCdXR0b24uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLkRSQVdFUl9CVE4pO1xuICAgICAgICAgICAgICAgIHZhciBkcmF3ZXJCdXR0b25JY29uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaScpO1xuICAgICAgICAgICAgICAgIGRyYXdlckJ1dHRvbkljb24uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLklDT04pO1xuICAgICAgICAgICAgICAgIGRyYXdlckJ1dHRvbkljb24uaW5uZXJIVE1MID0gdGhpcy5Db25zdGFudF8uTUVOVV9JQ09OO1xuICAgICAgICAgICAgICAgIGRyYXdlckJ1dHRvbi5hcHBlbmRDaGlsZChkcmF3ZXJCdXR0b25JY29uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLmRyYXdlcl8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uT05fTEFSR0VfU0NSRUVOKSkge1xuICAgICAgICAgICAgICAgIC8vSWYgZHJhd2VyIGhhcyBPTl9MQVJHRV9TQ1JFRU4gY2xhc3MgdGhlbiBhZGQgaXQgdG8gdGhlIGRyYXdlciB0b2dnbGUgYnV0dG9uIGFzIHdlbGwuXG4gICAgICAgICAgICAgICAgZHJhd2VyQnV0dG9uLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5PTl9MQVJHRV9TQ1JFRU4pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmRyYXdlcl8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uT05fU01BTExfU0NSRUVOKSkge1xuICAgICAgICAgICAgICAgIC8vSWYgZHJhd2VyIGhhcyBPTl9TTUFMTF9TQ1JFRU4gY2xhc3MgdGhlbiBhZGQgaXQgdG8gdGhlIGRyYXdlciB0b2dnbGUgYnV0dG9uIGFzIHdlbGwuXG4gICAgICAgICAgICAgICAgZHJhd2VyQnV0dG9uLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5PTl9TTUFMTF9TQ1JFRU4pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZHJhd2VyQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5kcmF3ZXJUb2dnbGVIYW5kbGVyXy5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIGRyYXdlckJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgdGhpcy5kcmF3ZXJUb2dnbGVIYW5kbGVyXy5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIC8vIEFkZCBhIGNsYXNzIGlmIHRoZSBsYXlvdXQgaGFzIGEgZHJhd2VyLCBmb3IgYWx0ZXJpbmcgdGhlIGxlZnQgcGFkZGluZy5cbiAgICAgICAgICAgIC8vIEFkZHMgdGhlIEhBU19EUkFXRVIgdG8gdGhlIGVsZW1lbnRzIHNpbmNlIHRoaXMuaGVhZGVyXyBtYXkgb3IgbWF5XG4gICAgICAgICAgICAvLyBub3QgYmUgcHJlc2VudC5cbiAgICAgICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLkhBU19EUkFXRVIpO1xuICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBhIGZpeGVkIGhlYWRlciwgYWRkIHRoZSBidXR0b24gdG8gdGhlIGhlYWRlciByYXRoZXIgdGhhblxuICAgICAgICAgICAgLy8gdGhlIGxheW91dC5cbiAgICAgICAgICAgIGlmICh0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLkZJWEVEX0hFQURFUikpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmhlYWRlcl8uaW5zZXJ0QmVmb3JlKGRyYXdlckJ1dHRvbiwgdGhpcy5oZWFkZXJfLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmVsZW1lbnRfLmluc2VydEJlZm9yZShkcmF3ZXJCdXR0b24sIHRoaXMuY29udGVudF8pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIG9iZnVzY2F0b3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgIG9iZnVzY2F0b3IuY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLk9CRlVTQ0FUT1IpO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50Xy5hcHBlbmRDaGlsZChvYmZ1c2NhdG9yKTtcbiAgICAgICAgICAgIG9iZnVzY2F0b3IuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmRyYXdlclRvZ2dsZUhhbmRsZXJfLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgdGhpcy5vYmZ1c2NhdG9yXyA9IG9iZnVzY2F0b3I7XG4gICAgICAgICAgICB0aGlzLmRyYXdlcl8uYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIHRoaXMua2V5Ym9hcmRFdmVudEhhbmRsZXJfLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgdGhpcy5kcmF3ZXJfLnNldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nLCAndHJ1ZScpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEtlZXAgYW4gZXllIG9uIHNjcmVlbiBzaXplLCBhbmQgYWRkL3JlbW92ZSBhdXhpbGlhcnkgY2xhc3MgZm9yIHN0eWxpbmdcbiAgICAgICAgLy8gb2Ygc21hbGwgc2NyZWVucy5cbiAgICAgICAgdGhpcy5zY3JlZW5TaXplTWVkaWFRdWVyeV8gPSB3aW5kb3cubWF0Y2hNZWRpYSh0aGlzLkNvbnN0YW50Xy5NQVhfV0lEVEgpO1xuICAgICAgICB0aGlzLnNjcmVlblNpemVNZWRpYVF1ZXJ5Xy5hZGRMaXN0ZW5lcih0aGlzLnNjcmVlblNpemVIYW5kbGVyXy5iaW5kKHRoaXMpKTtcbiAgICAgICAgdGhpcy5zY3JlZW5TaXplSGFuZGxlcl8oKTtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWJzLCBpZiBhbnkuXG4gICAgICAgIGlmICh0aGlzLmhlYWRlcl8gJiYgdGhpcy50YWJCYXJfKSB7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5IQVNfVEFCUyk7XG4gICAgICAgICAgICB2YXIgdGFiQ29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICB0YWJDb250YWluZXIuY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLlRBQl9DT05UQUlORVIpO1xuICAgICAgICAgICAgdGhpcy5oZWFkZXJfLmluc2VydEJlZm9yZSh0YWJDb250YWluZXIsIHRoaXMudGFiQmFyXyk7XG4gICAgICAgICAgICB0aGlzLmhlYWRlcl8ucmVtb3ZlQ2hpbGQodGhpcy50YWJCYXJfKTtcbiAgICAgICAgICAgIHZhciBsZWZ0QnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICBsZWZ0QnV0dG9uLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5UQUJfQkFSX0JVVFRPTik7XG4gICAgICAgICAgICBsZWZ0QnV0dG9uLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5UQUJfQkFSX0xFRlRfQlVUVE9OKTtcbiAgICAgICAgICAgIHZhciBsZWZ0QnV0dG9uSWNvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2knKTtcbiAgICAgICAgICAgIGxlZnRCdXR0b25JY29uLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JQ09OKTtcbiAgICAgICAgICAgIGxlZnRCdXR0b25JY29uLnRleHRDb250ZW50ID0gdGhpcy5Db25zdGFudF8uQ0hFVlJPTl9MRUZUO1xuICAgICAgICAgICAgbGVmdEJ1dHRvbi5hcHBlbmRDaGlsZChsZWZ0QnV0dG9uSWNvbik7XG4gICAgICAgICAgICBsZWZ0QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHRoaXMudGFiQmFyXy5zY3JvbGxMZWZ0IC09IHRoaXMuQ29uc3RhbnRfLlRBQl9TQ1JPTExfUElYRUxTO1xuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIHZhciByaWdodEJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgcmlnaHRCdXR0b24uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLlRBQl9CQVJfQlVUVE9OKTtcbiAgICAgICAgICAgIHJpZ2h0QnV0dG9uLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5UQUJfQkFSX1JJR0hUX0JVVFRPTik7XG4gICAgICAgICAgICB2YXIgcmlnaHRCdXR0b25JY29uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaScpO1xuICAgICAgICAgICAgcmlnaHRCdXR0b25JY29uLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JQ09OKTtcbiAgICAgICAgICAgIHJpZ2h0QnV0dG9uSWNvbi50ZXh0Q29udGVudCA9IHRoaXMuQ29uc3RhbnRfLkNIRVZST05fUklHSFQ7XG4gICAgICAgICAgICByaWdodEJ1dHRvbi5hcHBlbmRDaGlsZChyaWdodEJ1dHRvbkljb24pO1xuICAgICAgICAgICAgcmlnaHRCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50YWJCYXJfLnNjcm9sbExlZnQgKz0gdGhpcy5Db25zdGFudF8uVEFCX1NDUk9MTF9QSVhFTFM7XG4gICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgdGFiQ29udGFpbmVyLmFwcGVuZENoaWxkKGxlZnRCdXR0b24pO1xuICAgICAgICAgICAgdGFiQ29udGFpbmVyLmFwcGVuZENoaWxkKHRoaXMudGFiQmFyXyk7XG4gICAgICAgICAgICB0YWJDb250YWluZXIuYXBwZW5kQ2hpbGQocmlnaHRCdXR0b24pO1xuICAgICAgICAgICAgLy8gQWRkIGFuZCByZW1vdmUgdGFiIGJ1dHRvbnMgZGVwZW5kaW5nIG9uIHNjcm9sbCBwb3NpdGlvbiBhbmQgdG90YWxcbiAgICAgICAgICAgIC8vIHdpbmRvdyBzaXplLlxuICAgICAgICAgICAgdmFyIHRhYlVwZGF0ZUhhbmRsZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudGFiQmFyXy5zY3JvbGxMZWZ0ID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBsZWZ0QnV0dG9uLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JU19BQ1RJVkUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxlZnRCdXR0b24uY2xhc3NMaXN0LnJlbW92ZSh0aGlzLkNzc0NsYXNzZXNfLklTX0FDVElWRSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRhYkJhcl8uc2Nyb2xsTGVmdCA8IHRoaXMudGFiQmFyXy5zY3JvbGxXaWR0aCAtIHRoaXMudGFiQmFyXy5vZmZzZXRXaWR0aCkge1xuICAgICAgICAgICAgICAgICAgICByaWdodEJ1dHRvbi5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfQUNUSVZFKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByaWdodEJ1dHRvbi5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfQUNUSVZFKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LmJpbmQodGhpcyk7XG4gICAgICAgICAgICB0aGlzLnRhYkJhcl8uYWRkRXZlbnRMaXN0ZW5lcignc2Nyb2xsJywgdGFiVXBkYXRlSGFuZGxlcik7XG4gICAgICAgICAgICB0YWJVcGRhdGVIYW5kbGVyKCk7XG4gICAgICAgICAgICAvLyBVcGRhdGUgdGFicyB3aGVuIHRoZSB3aW5kb3cgcmVzaXplcy5cbiAgICAgICAgICAgIHZhciB3aW5kb3dSZXNpemVIYW5kbGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIC8vIFVzZSB0aW1lb3V0cyB0byBtYWtlIHN1cmUgaXQgZG9lc24ndCBoYXBwZW4gdG9vIG9mdGVuLlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnJlc2l6ZVRpbWVvdXRJZF8pIHtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMucmVzaXplVGltZW91dElkXyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMucmVzaXplVGltZW91dElkXyA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB0YWJVcGRhdGVIYW5kbGVyKCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVzaXplVGltZW91dElkXyA9IG51bGw7XG4gICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpLCB0aGlzLkNvbnN0YW50Xy5SRVNJWkVfVElNRU9VVCk7XG4gICAgICAgICAgICB9LmJpbmQodGhpcyk7XG4gICAgICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgd2luZG93UmVzaXplSGFuZGxlcik7XG4gICAgICAgICAgICBpZiAodGhpcy50YWJCYXJfLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLkpTX1JJUFBMRV9FRkZFQ1QpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50YWJCYXJfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5SSVBQTEVfSUdOT1JFX0VWRU5UUyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBTZWxlY3QgZWxlbWVudCB0YWJzLCBkb2N1bWVudCBwYW5lbHNcbiAgICAgICAgICAgIHZhciB0YWJzID0gdGhpcy50YWJCYXJfLnF1ZXJ5U2VsZWN0b3JBbGwoJy4nICsgdGhpcy5Dc3NDbGFzc2VzXy5UQUIpO1xuICAgICAgICAgICAgdmFyIHBhbmVscyA9IHRoaXMuY29udGVudF8ucXVlcnlTZWxlY3RvckFsbCgnLicgKyB0aGlzLkNzc0NsYXNzZXNfLlBBTkVMKTtcbiAgICAgICAgICAgIC8vIENyZWF0ZSBuZXcgdGFicyBmb3IgZWFjaCB0YWIgZWxlbWVudFxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0YWJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbmV3IE1hdGVyaWFsTGF5b3V0VGFiKHRhYnNbaV0sIHRhYnMsIHBhbmVscywgdGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfVVBHUkFERUQpO1xuICAgIH1cbn07XG4vKipcbiAgICogQ29uc3RydWN0b3IgZm9yIGFuIGluZGl2aWR1YWwgdGFiLlxuICAgKlxuICAgKiBAY29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gdGFiIFRoZSBIVE1MIGVsZW1lbnQgZm9yIHRoZSB0YWIuXG4gICAqIEBwYXJhbSB7IUFycmF5PEhUTUxFbGVtZW50Pn0gdGFicyBBcnJheSB3aXRoIEhUTUwgZWxlbWVudHMgZm9yIGFsbCB0YWJzLlxuICAgKiBAcGFyYW0geyFBcnJheTxIVE1MRWxlbWVudD59IHBhbmVscyBBcnJheSB3aXRoIEhUTUwgZWxlbWVudHMgZm9yIGFsbCBwYW5lbHMuXG4gICAqIEBwYXJhbSB7TWF0ZXJpYWxMYXlvdXR9IGxheW91dCBUaGUgTWF0ZXJpYWxMYXlvdXQgb2JqZWN0IHRoYXQgb3ducyB0aGUgdGFiLlxuICAgKi9cbmZ1bmN0aW9uIE1hdGVyaWFsTGF5b3V0VGFiKHRhYiwgdGFicywgcGFuZWxzLCBsYXlvdXQpIHtcbiAgICAvKipcbiAgICAgKiBBdXhpbGlhcnkgbWV0aG9kIHRvIHByb2dyYW1tYXRpY2FsbHkgc2VsZWN0IGEgdGFiIGluIHRoZSBVSS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzZWxlY3RUYWIoKSB7XG4gICAgICAgIHZhciBocmVmID0gdGFiLmhyZWYuc3BsaXQoJyMnKVsxXTtcbiAgICAgICAgdmFyIHBhbmVsID0gbGF5b3V0LmNvbnRlbnRfLnF1ZXJ5U2VsZWN0b3IoJyMnICsgaHJlZik7XG4gICAgICAgIGxheW91dC5yZXNldFRhYlN0YXRlXyh0YWJzKTtcbiAgICAgICAgbGF5b3V0LnJlc2V0UGFuZWxTdGF0ZV8ocGFuZWxzKTtcbiAgICAgICAgdGFiLmNsYXNzTGlzdC5hZGQobGF5b3V0LkNzc0NsYXNzZXNfLklTX0FDVElWRSk7XG4gICAgICAgIHBhbmVsLmNsYXNzTGlzdC5hZGQobGF5b3V0LkNzc0NsYXNzZXNfLklTX0FDVElWRSk7XG4gICAgfVxuICAgIGlmIChsYXlvdXQudGFiQmFyXy5jbGFzc0xpc3QuY29udGFpbnMobGF5b3V0LkNzc0NsYXNzZXNfLkpTX1JJUFBMRV9FRkZFQ1QpKSB7XG4gICAgICAgIHZhciByaXBwbGVDb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgIHJpcHBsZUNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKGxheW91dC5Dc3NDbGFzc2VzXy5SSVBQTEVfQ09OVEFJTkVSKTtcbiAgICAgICAgcmlwcGxlQ29udGFpbmVyLmNsYXNzTGlzdC5hZGQobGF5b3V0LkNzc0NsYXNzZXNfLkpTX1JJUFBMRV9FRkZFQ1QpO1xuICAgICAgICB2YXIgcmlwcGxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICByaXBwbGUuY2xhc3NMaXN0LmFkZChsYXlvdXQuQ3NzQ2xhc3Nlc18uUklQUExFKTtcbiAgICAgICAgcmlwcGxlQ29udGFpbmVyLmFwcGVuZENoaWxkKHJpcHBsZSk7XG4gICAgICAgIHRhYi5hcHBlbmRDaGlsZChyaXBwbGVDb250YWluZXIpO1xuICAgIH1cbiAgICB0YWIuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBpZiAodGFiLmdldEF0dHJpYnV0ZSgnaHJlZicpLmNoYXJBdCgwKSA9PT0gJyMnKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBzZWxlY3RUYWIoKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHRhYi5zaG93ID0gc2VsZWN0VGFiO1xufVxud2luZG93WydNYXRlcmlhbExheW91dFRhYiddID0gTWF0ZXJpYWxMYXlvdXRUYWI7XG4vLyBUaGUgY29tcG9uZW50IHJlZ2lzdGVycyBpdHNlbGYuIEl0IGNhbiBhc3N1bWUgY29tcG9uZW50SGFuZGxlciBpcyBhdmFpbGFibGVcbi8vIGluIHRoZSBnbG9iYWwgc2NvcGUuXG5jb21wb25lbnRIYW5kbGVyLnJlZ2lzdGVyKHtcbiAgICBjb25zdHJ1Y3RvcjogTWF0ZXJpYWxMYXlvdXQsXG4gICAgY2xhc3NBc1N0cmluZzogJ01hdGVyaWFsTGF5b3V0JyxcbiAgICBjc3NDbGFzczogJ21kbC1qcy1sYXlvdXQnXG59KTtcbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE1IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gICAqIENsYXNzIGNvbnN0cnVjdG9yIGZvciBEYXRhIFRhYmxlIENhcmQgTURMIGNvbXBvbmVudC5cbiAgICogSW1wbGVtZW50cyBNREwgY29tcG9uZW50IGRlc2lnbiBwYXR0ZXJuIGRlZmluZWQgYXQ6XG4gICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9qYXNvbm1heWVzL21kbC1jb21wb25lbnQtZGVzaWduLXBhdHRlcm5cbiAgICpcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7RWxlbWVudH0gZWxlbWVudCBUaGUgZWxlbWVudCB0aGF0IHdpbGwgYmUgdXBncmFkZWQuXG4gICAqL1xudmFyIE1hdGVyaWFsRGF0YVRhYmxlID0gZnVuY3Rpb24gTWF0ZXJpYWxEYXRhVGFibGUoZWxlbWVudCkge1xuICAgIHRoaXMuZWxlbWVudF8gPSBlbGVtZW50O1xuICAgIC8vIEluaXRpYWxpemUgaW5zdGFuY2UuXG4gICAgdGhpcy5pbml0KCk7XG59O1xud2luZG93WydNYXRlcmlhbERhdGFUYWJsZSddID0gTWF0ZXJpYWxEYXRhVGFibGU7XG4vKipcbiAgICogU3RvcmUgY29uc3RhbnRzIGluIG9uZSBwbGFjZSBzbyB0aGV5IGNhbiBiZSB1cGRhdGVkIGVhc2lseS5cbiAgICpcbiAgICogQGVudW0ge3N0cmluZyB8IG51bWJlcn1cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbERhdGFUYWJsZS5wcm90b3R5cGUuQ29uc3RhbnRfID0ge307XG4vKipcbiAgICogU3RvcmUgc3RyaW5ncyBmb3IgY2xhc3MgbmFtZXMgZGVmaW5lZCBieSB0aGlzIGNvbXBvbmVudCB0aGF0IGFyZSB1c2VkIGluXG4gICAqIEphdmFTY3JpcHQuIFRoaXMgYWxsb3dzIHVzIHRvIHNpbXBseSBjaGFuZ2UgaXQgaW4gb25lIHBsYWNlIHNob3VsZCB3ZVxuICAgKiBkZWNpZGUgdG8gbW9kaWZ5IGF0IGEgbGF0ZXIgZGF0ZS5cbiAgICpcbiAgICogQGVudW0ge3N0cmluZ31cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbERhdGFUYWJsZS5wcm90b3R5cGUuQ3NzQ2xhc3Nlc18gPSB7XG4gICAgREFUQV9UQUJMRTogJ21kbC1kYXRhLXRhYmxlJyxcbiAgICBTRUxFQ1RBQkxFOiAnbWRsLWRhdGEtdGFibGUtLXNlbGVjdGFibGUnLFxuICAgIFNFTEVDVF9FTEVNRU5UOiAnbWRsLWRhdGEtdGFibGVfX3NlbGVjdCcsXG4gICAgSVNfU0VMRUNURUQ6ICdpcy1zZWxlY3RlZCcsXG4gICAgSVNfVVBHUkFERUQ6ICdpcy11cGdyYWRlZCdcbn07XG4vKipcbiAgICogR2VuZXJhdGVzIGFuZCByZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB0b2dnbGVzIHRoZSBzZWxlY3Rpb24gc3RhdGUgb2YgYVxuICAgKiBzaW5nbGUgcm93IChvciBtdWx0aXBsZSByb3dzKS5cbiAgICpcbiAgICogQHBhcmFtIHtFbGVtZW50fSBjaGVja2JveCBDaGVja2JveCB0aGF0IHRvZ2dsZXMgdGhlIHNlbGVjdGlvbiBzdGF0ZS5cbiAgICogQHBhcmFtIHtFbGVtZW50fSByb3cgUm93IHRvIHRvZ2dsZSB3aGVuIGNoZWNrYm94IGNoYW5nZXMuXG4gICAqIEBwYXJhbSB7KEFycmF5PE9iamVjdD58Tm9kZUxpc3QpPX0gb3B0X3Jvd3MgUm93cyB0byB0b2dnbGUgd2hlbiBjaGVja2JveCBjaGFuZ2VzLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsRGF0YVRhYmxlLnByb3RvdHlwZS5zZWxlY3RSb3dfID0gZnVuY3Rpb24gKGNoZWNrYm94LCByb3csIG9wdF9yb3dzKSB7XG4gICAgaWYgKHJvdykge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKGNoZWNrYm94LmNoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICByb3cuY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLklTX1NFTEVDVEVEKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcm93LmNsYXNzTGlzdC5yZW1vdmUodGhpcy5Dc3NDbGFzc2VzXy5JU19TRUxFQ1RFRCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0uYmluZCh0aGlzKTtcbiAgICB9XG4gICAgaWYgKG9wdF9yb3dzKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgaTtcbiAgICAgICAgICAgIHZhciBlbDtcbiAgICAgICAgICAgIGlmIChjaGVja2JveC5jaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IG9wdF9yb3dzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsID0gb3B0X3Jvd3NbaV0ucXVlcnlTZWxlY3RvcigndGQnKS5xdWVyeVNlbGVjdG9yKCcubWRsLWNoZWNrYm94Jyk7XG4gICAgICAgICAgICAgICAgICAgIGVsWydNYXRlcmlhbENoZWNrYm94J10uY2hlY2soKTtcbiAgICAgICAgICAgICAgICAgICAgb3B0X3Jvd3NbaV0uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLklTX1NFTEVDVEVEKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBvcHRfcm93cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBlbCA9IG9wdF9yb3dzW2ldLnF1ZXJ5U2VsZWN0b3IoJ3RkJykucXVlcnlTZWxlY3RvcignLm1kbC1jaGVja2JveCcpO1xuICAgICAgICAgICAgICAgICAgICBlbFsnTWF0ZXJpYWxDaGVja2JveCddLnVuY2hlY2soKTtcbiAgICAgICAgICAgICAgICAgICAgb3B0X3Jvd3NbaV0uY2xhc3NMaXN0LnJlbW92ZSh0aGlzLkNzc0NsYXNzZXNfLklTX1NFTEVDVEVEKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0uYmluZCh0aGlzKTtcbiAgICB9XG59O1xuLyoqXG4gICAqIENyZWF0ZXMgYSBjaGVja2JveCBmb3IgYSBzaW5nbGUgb3Igb3IgbXVsdGlwbGUgcm93cyBhbmQgaG9va3MgdXAgdGhlXG4gICAqIGV2ZW50IGhhbmRsaW5nLlxuICAgKlxuICAgKiBAcGFyYW0ge0VsZW1lbnR9IHJvdyBSb3cgdG8gdG9nZ2xlIHdoZW4gY2hlY2tib3ggY2hhbmdlcy5cbiAgICogQHBhcmFtIHsoQXJyYXk8T2JqZWN0PnxOb2RlTGlzdCk9fSBvcHRfcm93cyBSb3dzIHRvIHRvZ2dsZSB3aGVuIGNoZWNrYm94IGNoYW5nZXMuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxEYXRhVGFibGUucHJvdG90eXBlLmNyZWF0ZUNoZWNrYm94XyA9IGZ1bmN0aW9uIChyb3csIG9wdF9yb3dzKSB7XG4gICAgdmFyIGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGFiZWwnKTtcbiAgICB2YXIgbGFiZWxDbGFzc2VzID0gW1xuICAgICAgICAnbWRsLWNoZWNrYm94JyxcbiAgICAgICAgJ21kbC1qcy1jaGVja2JveCcsXG4gICAgICAgICdtZGwtanMtcmlwcGxlLWVmZmVjdCcsXG4gICAgICAgIHRoaXMuQ3NzQ2xhc3Nlc18uU0VMRUNUX0VMRU1FTlRcbiAgICBdO1xuICAgIGxhYmVsLmNsYXNzTmFtZSA9IGxhYmVsQ2xhc3Nlcy5qb2luKCcgJyk7XG4gICAgdmFyIGNoZWNrYm94ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgICBjaGVja2JveC50eXBlID0gJ2NoZWNrYm94JztcbiAgICBjaGVja2JveC5jbGFzc0xpc3QuYWRkKCdtZGwtY2hlY2tib3hfX2lucHV0Jyk7XG4gICAgaWYgKHJvdykge1xuICAgICAgICBjaGVja2JveC5jaGVja2VkID0gcm93LmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLklTX1NFTEVDVEVEKTtcbiAgICAgICAgY2hlY2tib3guYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgdGhpcy5zZWxlY3RSb3dfKGNoZWNrYm94LCByb3cpKTtcbiAgICB9IGVsc2UgaWYgKG9wdF9yb3dzKSB7XG4gICAgICAgIGNoZWNrYm94LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIHRoaXMuc2VsZWN0Um93XyhjaGVja2JveCwgbnVsbCwgb3B0X3Jvd3MpKTtcbiAgICB9XG4gICAgbGFiZWwuYXBwZW5kQ2hpbGQoY2hlY2tib3gpO1xuICAgIGNvbXBvbmVudEhhbmRsZXIudXBncmFkZUVsZW1lbnQobGFiZWwsICdNYXRlcmlhbENoZWNrYm94Jyk7XG4gICAgcmV0dXJuIGxhYmVsO1xufTtcbi8qKlxuICAgKiBJbml0aWFsaXplIGVsZW1lbnQuXG4gICAqL1xuTWF0ZXJpYWxEYXRhVGFibGUucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuZWxlbWVudF8pIHtcbiAgICAgICAgdmFyIGZpcnN0SGVhZGVyID0gdGhpcy5lbGVtZW50Xy5xdWVyeVNlbGVjdG9yKCd0aCcpO1xuICAgICAgICB2YXIgYm9keVJvd3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLmVsZW1lbnRfLnF1ZXJ5U2VsZWN0b3JBbGwoJ3Rib2R5IHRyJykpO1xuICAgICAgICB2YXIgZm9vdFJvd3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLmVsZW1lbnRfLnF1ZXJ5U2VsZWN0b3JBbGwoJ3Rmb290IHRyJykpO1xuICAgICAgICB2YXIgcm93cyA9IGJvZHlSb3dzLmNvbmNhdChmb290Um93cyk7XG4gICAgICAgIGlmICh0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLlNFTEVDVEFCTEUpKSB7XG4gICAgICAgICAgICB2YXIgdGggPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0aCcpO1xuICAgICAgICAgICAgdmFyIGhlYWRlckNoZWNrYm94ID0gdGhpcy5jcmVhdGVDaGVja2JveF8obnVsbCwgcm93cyk7XG4gICAgICAgICAgICB0aC5hcHBlbmRDaGlsZChoZWFkZXJDaGVja2JveCk7XG4gICAgICAgICAgICBmaXJzdEhlYWRlci5wYXJlbnRFbGVtZW50Lmluc2VydEJlZm9yZSh0aCwgZmlyc3RIZWFkZXIpO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByb3dzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZpcnN0Q2VsbCA9IHJvd3NbaV0ucXVlcnlTZWxlY3RvcigndGQnKTtcbiAgICAgICAgICAgICAgICBpZiAoZmlyc3RDZWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0ZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RkJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyb3dzW2ldLnBhcmVudE5vZGUubm9kZU5hbWUudG9VcHBlckNhc2UoKSA9PT0gJ1RCT0RZJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJvd0NoZWNrYm94ID0gdGhpcy5jcmVhdGVDaGVja2JveF8ocm93c1tpXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZC5hcHBlbmRDaGlsZChyb3dDaGVja2JveCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcm93c1tpXS5pbnNlcnRCZWZvcmUodGQsIGZpcnN0Q2VsbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfVVBHUkFERUQpO1xuICAgICAgICB9XG4gICAgfVxufTtcbi8vIFRoZSBjb21wb25lbnQgcmVnaXN0ZXJzIGl0c2VsZi4gSXQgY2FuIGFzc3VtZSBjb21wb25lbnRIYW5kbGVyIGlzIGF2YWlsYWJsZVxuLy8gaW4gdGhlIGdsb2JhbCBzY29wZS5cbmNvbXBvbmVudEhhbmRsZXIucmVnaXN0ZXIoe1xuICAgIGNvbnN0cnVjdG9yOiBNYXRlcmlhbERhdGFUYWJsZSxcbiAgICBjbGFzc0FzU3RyaW5nOiAnTWF0ZXJpYWxEYXRhVGFibGUnLFxuICAgIGNzc0NsYXNzOiAnbWRsLWpzLWRhdGEtdGFibGUnXG59KTtcbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE1IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gICAqIENsYXNzIGNvbnN0cnVjdG9yIGZvciBSaXBwbGUgTURMIGNvbXBvbmVudC5cbiAgICogSW1wbGVtZW50cyBNREwgY29tcG9uZW50IGRlc2lnbiBwYXR0ZXJuIGRlZmluZWQgYXQ6XG4gICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9qYXNvbm1heWVzL21kbC1jb21wb25lbnQtZGVzaWduLXBhdHRlcm5cbiAgICpcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsZW1lbnQgVGhlIGVsZW1lbnQgdGhhdCB3aWxsIGJlIHVwZ3JhZGVkLlxuICAgKi9cbnZhciBNYXRlcmlhbFJpcHBsZSA9IGZ1bmN0aW9uIE1hdGVyaWFsUmlwcGxlKGVsZW1lbnQpIHtcbiAgICB0aGlzLmVsZW1lbnRfID0gZWxlbWVudDtcbiAgICAvLyBJbml0aWFsaXplIGluc3RhbmNlLlxuICAgIHRoaXMuaW5pdCgpO1xufTtcbndpbmRvd1snTWF0ZXJpYWxSaXBwbGUnXSA9IE1hdGVyaWFsUmlwcGxlO1xuLyoqXG4gICAqIFN0b3JlIGNvbnN0YW50cyBpbiBvbmUgcGxhY2Ugc28gdGhleSBjYW4gYmUgdXBkYXRlZCBlYXNpbHkuXG4gICAqXG4gICAqIEBlbnVtIHtzdHJpbmcgfCBudW1iZXJ9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxSaXBwbGUucHJvdG90eXBlLkNvbnN0YW50XyA9IHtcbiAgICBJTklUSUFMX1NDQUxFOiAnc2NhbGUoMC4wMDAxLCAwLjAwMDEpJyxcbiAgICBJTklUSUFMX1NJWkU6ICcxcHgnLFxuICAgIElOSVRJQUxfT1BBQ0lUWTogJzAuNCcsXG4gICAgRklOQUxfT1BBQ0lUWTogJzAnLFxuICAgIEZJTkFMX1NDQUxFOiAnJ1xufTtcbi8qKlxuICAgKiBTdG9yZSBzdHJpbmdzIGZvciBjbGFzcyBuYW1lcyBkZWZpbmVkIGJ5IHRoaXMgY29tcG9uZW50IHRoYXQgYXJlIHVzZWQgaW5cbiAgICogSmF2YVNjcmlwdC4gVGhpcyBhbGxvd3MgdXMgdG8gc2ltcGx5IGNoYW5nZSBpdCBpbiBvbmUgcGxhY2Ugc2hvdWxkIHdlXG4gICAqIGRlY2lkZSB0byBtb2RpZnkgYXQgYSBsYXRlciBkYXRlLlxuICAgKlxuICAgKiBAZW51bSB7c3RyaW5nfVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsUmlwcGxlLnByb3RvdHlwZS5Dc3NDbGFzc2VzXyA9IHtcbiAgICBSSVBQTEVfQ0VOVEVSOiAnbWRsLXJpcHBsZS0tY2VudGVyJyxcbiAgICBSSVBQTEVfRUZGRUNUX0lHTk9SRV9FVkVOVFM6ICdtZGwtanMtcmlwcGxlLWVmZmVjdC0taWdub3JlLWV2ZW50cycsXG4gICAgUklQUExFOiAnbWRsLXJpcHBsZScsXG4gICAgSVNfQU5JTUFUSU5HOiAnaXMtYW5pbWF0aW5nJyxcbiAgICBJU19WSVNJQkxFOiAnaXMtdmlzaWJsZSdcbn07XG4vKipcbiAgICogSGFuZGxlIG1vdXNlIC8gZmluZ2VyIGRvd24gb24gZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnQgVGhlIGV2ZW50IHRoYXQgZmlyZWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxSaXBwbGUucHJvdG90eXBlLmRvd25IYW5kbGVyXyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIGlmICghdGhpcy5yaXBwbGVFbGVtZW50Xy5zdHlsZS53aWR0aCAmJiAhdGhpcy5yaXBwbGVFbGVtZW50Xy5zdHlsZS5oZWlnaHQpIHtcbiAgICAgICAgdmFyIHJlY3QgPSB0aGlzLmVsZW1lbnRfLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICB0aGlzLmJvdW5kSGVpZ2h0ID0gcmVjdC5oZWlnaHQ7XG4gICAgICAgIHRoaXMuYm91bmRXaWR0aCA9IHJlY3Qud2lkdGg7XG4gICAgICAgIHRoaXMucmlwcGxlU2l6ZV8gPSBNYXRoLnNxcnQocmVjdC53aWR0aCAqIHJlY3Qud2lkdGggKyByZWN0LmhlaWdodCAqIHJlY3QuaGVpZ2h0KSAqIDIgKyAyO1xuICAgICAgICB0aGlzLnJpcHBsZUVsZW1lbnRfLnN0eWxlLndpZHRoID0gdGhpcy5yaXBwbGVTaXplXyArICdweCc7XG4gICAgICAgIHRoaXMucmlwcGxlRWxlbWVudF8uc3R5bGUuaGVpZ2h0ID0gdGhpcy5yaXBwbGVTaXplXyArICdweCc7XG4gICAgfVxuICAgIHRoaXMucmlwcGxlRWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLklTX1ZJU0lCTEUpO1xuICAgIGlmIChldmVudC50eXBlID09PSAnbW91c2Vkb3duJyAmJiB0aGlzLmlnbm9yaW5nTW91c2VEb3duXykge1xuICAgICAgICB0aGlzLmlnbm9yaW5nTW91c2VEb3duXyA9IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChldmVudC50eXBlID09PSAndG91Y2hzdGFydCcpIHtcbiAgICAgICAgICAgIHRoaXMuaWdub3JpbmdNb3VzZURvd25fID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZnJhbWVDb3VudCA9IHRoaXMuZ2V0RnJhbWVDb3VudCgpO1xuICAgICAgICBpZiAoZnJhbWVDb3VudCA+IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNldEZyYW1lQ291bnQoMSk7XG4gICAgICAgIHZhciBib3VuZCA9IGV2ZW50LmN1cnJlbnRUYXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIHZhciB4O1xuICAgICAgICB2YXIgeTtcbiAgICAgICAgLy8gQ2hlY2sgaWYgd2UgYXJlIGhhbmRsaW5nIGEga2V5Ym9hcmQgY2xpY2suXG4gICAgICAgIGlmIChldmVudC5jbGllbnRYID09PSAwICYmIGV2ZW50LmNsaWVudFkgPT09IDApIHtcbiAgICAgICAgICAgIHggPSBNYXRoLnJvdW5kKGJvdW5kLndpZHRoIC8gMik7XG4gICAgICAgICAgICB5ID0gTWF0aC5yb3VuZChib3VuZC5oZWlnaHQgLyAyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBjbGllbnRYID0gZXZlbnQuY2xpZW50WCA/IGV2ZW50LmNsaWVudFggOiBldmVudC50b3VjaGVzWzBdLmNsaWVudFg7XG4gICAgICAgICAgICB2YXIgY2xpZW50WSA9IGV2ZW50LmNsaWVudFkgPyBldmVudC5jbGllbnRZIDogZXZlbnQudG91Y2hlc1swXS5jbGllbnRZO1xuICAgICAgICAgICAgeCA9IE1hdGgucm91bmQoY2xpZW50WCAtIGJvdW5kLmxlZnQpO1xuICAgICAgICAgICAgeSA9IE1hdGgucm91bmQoY2xpZW50WSAtIGJvdW5kLnRvcCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zZXRSaXBwbGVYWSh4LCB5KTtcbiAgICAgICAgdGhpcy5zZXRSaXBwbGVTdHlsZXModHJ1ZSk7XG4gICAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy5hbmltRnJhbWVIYW5kbGVyLmJpbmQodGhpcykpO1xuICAgIH1cbn07XG4vKipcbiAgICogSGFuZGxlIG1vdXNlIC8gZmluZ2VyIHVwIG9uIGVsZW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IFRoZSBldmVudCB0aGF0IGZpcmVkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsUmlwcGxlLnByb3RvdHlwZS51cEhhbmRsZXJfID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgLy8gRG9uJ3QgZmlyZSBmb3IgdGhlIGFydGlmaWNpYWwgXCJtb3VzZXVwXCIgZ2VuZXJhdGVkIGJ5IGEgZG91YmxlLWNsaWNrLlxuICAgIGlmIChldmVudCAmJiBldmVudC5kZXRhaWwgIT09IDIpIHtcbiAgICAgICAgLy8gQWxsb3cgYSByZXBhaW50IHRvIG9jY3VyIGJlZm9yZSByZW1vdmluZyB0aGlzIGNsYXNzLCBzbyB0aGUgYW5pbWF0aW9uXG4gICAgICAgIC8vIHNob3dzIGZvciB0YXAgZXZlbnRzLCB3aGljaCBzZWVtIHRvIHRyaWdnZXIgYSBtb3VzZXVwIHRvbyBzb29uIGFmdGVyXG4gICAgICAgIC8vIG1vdXNlZG93bi5cbiAgICAgICAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5yaXBwbGVFbGVtZW50Xy5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfVklTSUJMRSk7XG4gICAgICAgIH0uYmluZCh0aGlzKSwgMCk7XG4gICAgfVxufTtcbi8qKlxuICAgKiBJbml0aWFsaXplIGVsZW1lbnQuXG4gICAqL1xuTWF0ZXJpYWxSaXBwbGUucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuZWxlbWVudF8pIHtcbiAgICAgICAgdmFyIHJlY2VudGVyaW5nID0gdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5SSVBQTEVfQ0VOVEVSKTtcbiAgICAgICAgaWYgKCF0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLlJJUFBMRV9FRkZFQ1RfSUdOT1JFX0VWRU5UUykpIHtcbiAgICAgICAgICAgIHRoaXMucmlwcGxlRWxlbWVudF8gPSB0aGlzLmVsZW1lbnRfLnF1ZXJ5U2VsZWN0b3IoJy4nICsgdGhpcy5Dc3NDbGFzc2VzXy5SSVBQTEUpO1xuICAgICAgICAgICAgdGhpcy5mcmFtZUNvdW50XyA9IDA7XG4gICAgICAgICAgICB0aGlzLnJpcHBsZVNpemVfID0gMDtcbiAgICAgICAgICAgIHRoaXMueF8gPSAwO1xuICAgICAgICAgICAgdGhpcy55XyA9IDA7XG4gICAgICAgICAgICAvLyBUb3VjaCBzdGFydCBwcm9kdWNlcyBhIGNvbXBhdCBtb3VzZSBkb3duIGV2ZW50LCB3aGljaCB3b3VsZCBjYXVzZSBhXG4gICAgICAgICAgICAvLyBzZWNvbmQgcmlwcGxlcy4gVG8gYXZvaWQgdGhhdCwgd2UgdXNlIHRoaXMgcHJvcGVydHkgdG8gaWdub3JlIHRoZSBmaXJzdFxuICAgICAgICAgICAgLy8gbW91c2UgZG93biBhZnRlciBhIHRvdWNoIHN0YXJ0LlxuICAgICAgICAgICAgdGhpcy5pZ25vcmluZ01vdXNlRG93bl8gPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuYm91bmREb3duSGFuZGxlciA9IHRoaXMuZG93bkhhbmRsZXJfLmJpbmQodGhpcyk7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRfLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIHRoaXMuYm91bmREb3duSGFuZGxlcik7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRfLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCB0aGlzLmJvdW5kRG93bkhhbmRsZXIpO1xuICAgICAgICAgICAgdGhpcy5ib3VuZFVwSGFuZGxlciA9IHRoaXMudXBIYW5kbGVyXy5iaW5kKHRoaXMpO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50Xy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5ib3VuZFVwSGFuZGxlcik7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRfLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbGVhdmUnLCB0aGlzLmJvdW5kVXBIYW5kbGVyKTtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudF8uYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCB0aGlzLmJvdW5kVXBIYW5kbGVyKTtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudF8uYWRkRXZlbnRMaXN0ZW5lcignYmx1cicsIHRoaXMuYm91bmRVcEhhbmRsZXIpO1xuICAgICAgICAgICAgLyoqXG4gICAgICAgICAqIEdldHRlciBmb3IgZnJhbWVDb3VudF8uXG4gICAgICAgICAqIEByZXR1cm4ge251bWJlcn0gdGhlIGZyYW1lIGNvdW50LlxuICAgICAgICAgKi9cbiAgICAgICAgICAgIHRoaXMuZ2V0RnJhbWVDb3VudCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5mcmFtZUNvdW50XztcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAvKipcbiAgICAgICAgICogU2V0dGVyIGZvciBmcmFtZUNvdW50Xy5cbiAgICAgICAgICogQHBhcmFtIHtudW1iZXJ9IGZDIHRoZSBmcmFtZSBjb3VudC5cbiAgICAgICAgICovXG4gICAgICAgICAgICB0aGlzLnNldEZyYW1lQ291bnQgPSBmdW5jdGlvbiAoZkMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmZyYW1lQ291bnRfID0gZkM7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgLyoqXG4gICAgICAgICAqIEdldHRlciBmb3IgcmlwcGxlRWxlbWVudF8uXG4gICAgICAgICAqIEByZXR1cm4ge0VsZW1lbnR9IHRoZSByaXBwbGUgZWxlbWVudC5cbiAgICAgICAgICovXG4gICAgICAgICAgICB0aGlzLmdldFJpcHBsZUVsZW1lbnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucmlwcGxlRWxlbWVudF87XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgLyoqXG4gICAgICAgICAqIFNldHMgdGhlIHJpcHBsZSBYIGFuZCBZIGNvb3JkaW5hdGVzLlxuICAgICAgICAgKiBAcGFyYW0gIHtudW1iZXJ9IG5ld1ggdGhlIG5ldyBYIGNvb3JkaW5hdGVcbiAgICAgICAgICogQHBhcmFtICB7bnVtYmVyfSBuZXdZIHRoZSBuZXcgWSBjb29yZGluYXRlXG4gICAgICAgICAqL1xuICAgICAgICAgICAgdGhpcy5zZXRSaXBwbGVYWSA9IGZ1bmN0aW9uIChuZXdYLCBuZXdZKSB7XG4gICAgICAgICAgICAgICAgdGhpcy54XyA9IG5ld1g7XG4gICAgICAgICAgICAgICAgdGhpcy55XyA9IG5ld1k7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgLyoqXG4gICAgICAgICAqIFNldHMgdGhlIHJpcHBsZSBzdHlsZXMuXG4gICAgICAgICAqIEBwYXJhbSAge2Jvb2xlYW59IHN0YXJ0IHdoZXRoZXIgb3Igbm90IHRoaXMgaXMgdGhlIHN0YXJ0IGZyYW1lLlxuICAgICAgICAgKi9cbiAgICAgICAgICAgIHRoaXMuc2V0UmlwcGxlU3R5bGVzID0gZnVuY3Rpb24gKHN0YXJ0KSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucmlwcGxlRWxlbWVudF8gIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRyYW5zZm9ybVN0cmluZztcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNjYWxlO1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2l6ZTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9mZnNldCA9ICd0cmFuc2xhdGUoJyArIHRoaXMueF8gKyAncHgsICcgKyB0aGlzLnlfICsgJ3B4KSc7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdGFydCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NhbGUgPSB0aGlzLkNvbnN0YW50Xy5JTklUSUFMX1NDQUxFO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZSA9IHRoaXMuQ29uc3RhbnRfLklOSVRJQUxfU0laRTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjYWxlID0gdGhpcy5Db25zdGFudF8uRklOQUxfU0NBTEU7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaXplID0gdGhpcy5yaXBwbGVTaXplXyArICdweCc7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVjZW50ZXJpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXQgPSAndHJhbnNsYXRlKCcgKyB0aGlzLmJvdW5kV2lkdGggLyAyICsgJ3B4LCAnICsgdGhpcy5ib3VuZEhlaWdodCAvIDIgKyAncHgpJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm1TdHJpbmcgPSAndHJhbnNsYXRlKC01MCUsIC01MCUpICcgKyBvZmZzZXQgKyBzY2FsZTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yaXBwbGVFbGVtZW50Xy5zdHlsZS53ZWJraXRUcmFuc2Zvcm0gPSB0cmFuc2Zvcm1TdHJpbmc7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmlwcGxlRWxlbWVudF8uc3R5bGUubXNUcmFuc2Zvcm0gPSB0cmFuc2Zvcm1TdHJpbmc7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmlwcGxlRWxlbWVudF8uc3R5bGUudHJhbnNmb3JtID0gdHJhbnNmb3JtU3RyaW5nO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RhcnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmlwcGxlRWxlbWVudF8uY2xhc3NMaXN0LnJlbW92ZSh0aGlzLkNzc0NsYXNzZXNfLklTX0FOSU1BVElORyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJpcHBsZUVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JU19BTklNQVRJTkcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgKiBIYW5kbGVzIGFuIGFuaW1hdGlvbiBmcmFtZS5cbiAgICAgICAgICovXG4gICAgICAgICAgICB0aGlzLmFuaW1GcmFtZUhhbmRsZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZnJhbWVDb3VudF8tLSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLmFuaW1GcmFtZUhhbmRsZXIuYmluZCh0aGlzKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRSaXBwbGVTdHlsZXMoZmFsc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG59O1xuLy8gVGhlIGNvbXBvbmVudCByZWdpc3RlcnMgaXRzZWxmLiBJdCBjYW4gYXNzdW1lIGNvbXBvbmVudEhhbmRsZXIgaXMgYXZhaWxhYmxlXG4vLyBpbiB0aGUgZ2xvYmFsIHNjb3BlLlxuY29tcG9uZW50SGFuZGxlci5yZWdpc3Rlcih7XG4gICAgY29uc3RydWN0b3I6IE1hdGVyaWFsUmlwcGxlLFxuICAgIGNsYXNzQXNTdHJpbmc6ICdNYXRlcmlhbFJpcHBsZScsXG4gICAgY3NzQ2xhc3M6ICdtZGwtanMtcmlwcGxlLWVmZmVjdCcsXG4gICAgd2lkZ2V0OiBmYWxzZVxufSk7XG59KCkpO1xuIiwiLy8gVE9ETzogVGhpcyBpcyBtZXNzeSBjbGVhbiBpdCB1cFxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHZhciBjb250YWluZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubWRsLWxheW91dF9fY29udGFpbmVyJyk7XG4gIHZhciBkcmF3ZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubWRsLWxheW91dF9fZHJhd2VyJyk7XG4gIHZhciBkcmF3ZXJCdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubWRsLWxheW91dF9fZHJhd2VyLWJ1dHRvbicpO1xuICB2YXIgb2JmdXNjYXRvciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5tZGwtbGF5b3V0X19vYmZ1c2NhdG9yJyk7XG5cbiAgLy8gU2luY2UgTURMIGlzbid0IGhhbmRsaW5nIHRoZSAnZXNjYXBlJyBrZXkgcHJvcGVybHksIEkgaGFkIHRvIGRvIHRoaXNcbiAgLy8gSGlkZXMgZHJhd2VyIGFuZCBvYmZ1c2NhdG9yIG9uIGVzY2FwZSBrZXlkb3duXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZnVuY3Rpb24oZXZ0KSB7XG4gICAgaWYgKGV2dC5rZXlDb2RlID09PSAyNyAmJiBkcmF3ZXIuY2xhc3NMaXN0LmNvbnRhaW5zKCdpcy12aXNpYmxlJykpIHtcbiAgICAgIGNsb3NlRHJhd2VyKCk7XG4gICAgICBoZWFkZXJBY2Nlc3NpYmlsaXR5VG9nZ2xlKCk7XG4gICAgfVxuICB9KTtcblxuICBmdW5jdGlvbiBjbG9zZURyYXdlcigpIHtcbiAgICBkcmF3ZXIuY2xhc3NOYW1lID0gJ21kbC1sYXlvdXRfX2RyYXdlcic7XG4gICAgb2JmdXNjYXRvci5jbGFzc05hbWUgPSAnbWRsLWxheW91dF9fb2JmdXNjYXRvcic7XG4gIH1cblxuLyoqKioqKioqKioqKioqKioqKiovXG4vKiBFdmVudCBMaXN0ZW5lcnMgKi9cbi8qKioqKioqKioqKioqKioqKioqL1xuICBkcmF3ZXJCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICBoZWFkZXJBY2Nlc3NpYmlsaXR5VG9nZ2xlKCk7XG4gIH0pO1xuXG4gIGRyYXdlckJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZnVuY3Rpb24oZXZ0KSB7XG4gICAgLy8gMjcgaXMgZXNjYXBlIGtleVxuICAgIC8vIENhbGwgYWNjZXNzaWJpbGl0eSBmdW5jdGlvbiBpZiAnc3BhY2UnIG9yICdlbnRlcicgaXMgcHJlc3NlZFxuICAgIGlmIChldnQua2V5Q29kZSA9PT0gMzIgfHwgZXZ0LmtleUNvZGUgPT09IDEzKSB7XG4gICAgICBoZWFkZXJBY2Nlc3NpYmlsaXR5VG9nZ2xlKCk7XG4gICAgfVxuICB9KTtcblxuICAvLyBBZGQgZXZlbnQgbGlzdGVuZXIgdG8gZHJhd2VyIGZvciBlc2Mga2V5XG4gIG9iZnVzY2F0b3IuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICBoZWFkZXJBY2Nlc3NpYmlsaXR5VG9nZ2xlKCk7XG4gIH0pO1xuXG5cblxuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4vKiBBY2Nlc3NpYmlsaXR5IEZ1bmN0aW9uICovXG4vKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4gIC8vIFZhcmlhYmxlcyBuZWVkZWQgYnkgaGVhZGVyQWNjZXNzaWJpbGl0eVRvZ2dsZSgpIC0gRGVmaW5lZCBoZXJlIGZvciBmZXdlciBxdWVyaWVzIHRvIGRvY3VtZW50XG4gIHZhciB0aXRsZVJvdyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5zaXRlLWhlYWRlcl9fdGl0bGUtcm93Jyk7XG4gIHZhciBsaW5rUm93ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnNpdGUtaGVhZGVyX19saW5rLXJvdycpO1xuICB2YXIgcHJvamVjdExpbmtzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnNpdGUtaGVhZGVyX19saW5rLXJvdyAubmF2aWdhdGlvbl9fbmVzdGVkLWxpbmtzJyk7XG4gIHZhciBoZWFkZXJMaW5rcyA9IGxpbmtSb3cuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnbWRsLW5hdmlnYXRpb25fX2xpbmsnKTtcbiAgdmFyIGRyYXdlckxpbmtzID0gZHJhd2VyLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ21kbC1uYXZpZ2F0aW9uX19saW5rJyk7XG5cbiAgLy8gSW5pdGlhbGl6ZSBkcmF3ZXJMaW5rcyAndGFiaW5kZXgnIHRvIC0xXG4gIGNoYW5nZVRhYkluZGV4KGRyYXdlckxpbmtzLCAnLTEnKTtcblxuICAvLyBUaGUgZnVuY3Rpb25cbiAgZnVuY3Rpb24gaGVhZGVyQWNjZXNzaWJpbGl0eVRvZ2dsZSgpIHtcbiAgICBpZiAodGl0bGVSb3cuZ2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicpID09PSAnZmFsc2UnKSB7XG4gICAgICAvLyBIaWRlIGhlYWRlciBpbmZvIGZyb20gc2NyZWVuLXJlYWRlcnMgd2hlbiBkcmF3ZXIgb3BlbnNcbiAgICAgIHRpdGxlUm93LnNldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nLCAndHJ1ZScpO1xuICAgICAgbGlua1Jvdy5zZXRBdHRyaWJ1dGUoJ2FyaWEtaGlkZGVuJywgJ3RydWUnKTtcblxuICAgICAgLy8gTWFrZSBzdXJlIGtleWJvYXJkIHVzZXJzIGFyZW4ndCB0YWJiaW5nIHRocm91Z2ggb2JmdXNjYXRlZCBsaW5rc1xuICAgICAgY2hhbmdlVGFiSW5kZXgoaGVhZGVyTGlua3MsICctMScpO1xuICAgICAgY2hhbmdlVGFiSW5kZXgoZHJhd2VyTGlua3MsICcwJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFNob3cgaGVhZGVyIGluZm8gdG8gc2NyZWVuLXJlYWRlcnMgd2hlbiB0aGUgZHJhd2VyIGNsb3Nlc1xuICAgICAgdGl0bGVSb3cuc2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicsICdmYWxzZScpO1xuICAgICAgbGlua1Jvdy5zZXRBdHRyaWJ1dGUoJ2FyaWEtaGlkZGVuJywgJ2ZhbHNlJyk7XG4gICAgICAvLyBIaWRlIG5lc3RlZCBuYXZpZ2F0aW9uIGxpbmtzIGluIC5zaXRlLWhlYWRlcl9fbGluay1yb3cgKGJlY2F1c2UgdGVtcGxhdGluZylcbiAgICAgIHByb2plY3RMaW5rcy5zZXRBdHRyaWJ1dGUoJ2FyaWEtaGlkZGVuJywgJ3RydWUnKTtcblxuICAgICAgY2hhbmdlVGFiSW5kZXgoaGVhZGVyTGlua3MsICcwJyk7XG4gICAgICBjaGFuZ2VUYWJJbmRleChkcmF3ZXJMaW5rcywgJy0xJyk7XG4gICAgfVxuICAgIC8vIGFkZCB0YWJpbmRleCAtMSB0byBoZWFkZXIgZWxlbWVudHNcbiAgfVxuXG4gIGZ1bmN0aW9uIGNoYW5nZVRhYkluZGV4KGVscywgdmFsKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGVsc1tpXS5zZXRBdHRyaWJ1dGUoJ3RhYmluZGV4JywgdmFsKTtcbiAgICB9XG4gIH1cbn0pO1xuXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
