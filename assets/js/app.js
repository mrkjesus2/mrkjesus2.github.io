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

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

(function () {

  var supportCustomEvent = window.CustomEvent;
  if (!supportCustomEvent || (typeof supportCustomEvent === 'undefined' ? 'undefined' : _typeof(supportCustomEvent)) == 'object') {
    supportCustomEvent = function CustomEvent(event, x) {
      x = x || {};
      var ev = document.createEvent('CustomEvent');
      ev.initCustomEvent(event, !!x.bubbles, !!x.cancelable, x.detail || null);
      return ev;
    };
    supportCustomEvent.prototype = window.Event.prototype;
  }

  /**
   * Finds the nearest <dialog> from the passed element.
   *
   * @param {Element} el to search from
   * @return {HTMLDialogElement} dialog found
   */
  function findNearestDialog(el) {
    while (el) {
      if (el.nodeName.toUpperCase() == 'DIALOG') {
        return (/** @type {HTMLDialogElement} */el
        );
      }
      el = el.parentElement;
    }
    return null;
  }

  /**
   * Blur the specified element, as long as it's not the HTML body element.
   * This works around an IE9/10 bug - blurring the body causes Windows to
   * blur the whole application.
   *
   * @param {Element} el to blur
   */
  function safeBlur(el) {
    if (el && el.blur && el != document.body) {
      el.blur();
    }
  }

  /**
   * @param {!NodeList} nodeList to search
   * @param {Node} node to find
   * @return {boolean} whether node is inside nodeList
   */
  function inNodeList(nodeList, node) {
    for (var i = 0; i < nodeList.length; ++i) {
      if (nodeList[i] == node) {
        return true;
      }
    }
    return false;
  }

  /**
   * @param {!HTMLDialogElement} dialog to upgrade
   * @constructor
   */
  function dialogPolyfillInfo(dialog) {
    this.dialog_ = dialog;
    this.replacedStyleTop_ = false;
    this.openAsModal_ = false;

    // Set a11y role. Browsers that support dialog implicitly know this already.
    if (!dialog.hasAttribute('role')) {
      dialog.setAttribute('role', 'dialog');
    }

    dialog.show = this.show.bind(this);
    dialog.showModal = this.showModal.bind(this);
    dialog.close = this.close.bind(this);

    if (!('returnValue' in dialog)) {
      dialog.returnValue = '';
    }

    this.maybeHideModal = this.maybeHideModal.bind(this);
    if ('MutationObserver' in window) {
      // IE11+, most other browsers.
      var mo = new MutationObserver(this.maybeHideModal);
      mo.observe(dialog, { attributes: true, attributeFilter: ['open'] });
    } else {
      dialog.addEventListener('DOMAttrModified', this.maybeHideModal);
    }
    // Note that the DOM is observed inside DialogManager while any dialog
    // is being displayed as a modal, to catch modal removal from the DOM.

    Object.defineProperty(dialog, 'open', {
      set: this.setOpen.bind(this),
      get: dialog.hasAttribute.bind(dialog, 'open')
    });

    this.backdrop_ = document.createElement('div');
    this.backdrop_.className = 'backdrop';
    this.backdropClick_ = this.backdropClick_.bind(this);
  }

  dialogPolyfillInfo.prototype = {

    get dialog() {
      return this.dialog_;
    },

    /**
     * Maybe remove this dialog from the modal top layer. This is called when
     * a modal dialog may no longer be tenable, e.g., when the dialog is no
     * longer open or is no longer part of the DOM.
     */
    maybeHideModal: function maybeHideModal() {
      if (!this.openAsModal_) {
        return;
      }
      if (this.dialog_.hasAttribute('open') && document.body.contains(this.dialog_)) {
        return;
      }

      this.openAsModal_ = false;
      this.dialog_.style.zIndex = '';

      // This won't match the native <dialog> exactly because if the user set
      // top on a centered polyfill dialog, that top gets thrown away when the
      // dialog is closed. Not sure it's possible to polyfill this perfectly.
      if (this.replacedStyleTop_) {
        this.dialog_.style.top = '';
        this.replacedStyleTop_ = false;
      }

      // Optimistically clear the modal part of this <dialog>.
      this.backdrop_.removeEventListener('click', this.backdropClick_);
      if (this.backdrop_.parentElement) {
        this.backdrop_.parentElement.removeChild(this.backdrop_);
      }
      dialogPolyfill.dm.removeDialog(this);
    },

    /**
     * @param {boolean} value whether to open or close this dialog
     */
    setOpen: function setOpen(value) {
      if (value) {
        this.dialog_.hasAttribute('open') || this.dialog_.setAttribute('open', '');
      } else {
        this.dialog_.removeAttribute('open');
        this.maybeHideModal(); // nb. redundant with MutationObserver
      }
    },

    /**
     * Handles clicks on the fake .backdrop element, redirecting them as if
     * they were on the dialog itself.
     *
     * @param {!Event} e to redirect
     */
    backdropClick_: function backdropClick_(e) {
      var redirectedEvent = document.createEvent('MouseEvents');
      redirectedEvent.initMouseEvent(e.type, e.bubbles, e.cancelable, window, e.detail, e.screenX, e.screenY, e.clientX, e.clientY, e.ctrlKey, e.altKey, e.shiftKey, e.metaKey, e.button, e.relatedTarget);
      this.dialog_.dispatchEvent(redirectedEvent);
      e.stopPropagation();
    },

    /**
     * Sets the zIndex for the backdrop and dialog.
     *
     * @param {number} backdropZ
     * @param {number} dialogZ
     */
    updateZIndex: function updateZIndex(backdropZ, dialogZ) {
      this.backdrop_.style.zIndex = backdropZ;
      this.dialog_.style.zIndex = dialogZ;
    },

    /**
     * Shows the dialog. This is idempotent and will always succeed.
     */
    show: function show() {
      this.setOpen(true);
    },

    /**
     * Show this dialog modally.
     */
    showModal: function showModal() {
      if (this.dialog_.hasAttribute('open')) {
        throw new Error('Failed to execute \'showModal\' on dialog: The element is already open, and therefore cannot be opened modally.');
      }
      if (!document.body.contains(this.dialog_)) {
        throw new Error('Failed to execute \'showModal\' on dialog: The element is not in a Document.');
      }
      if (!dialogPolyfill.dm.pushDialog(this)) {
        throw new Error('Failed to execute \'showModal\' on dialog: There are too many open modal dialogs.');
      }
      this.show();
      this.openAsModal_ = true;

      // Optionally center vertically, relative to the current viewport.
      if (dialogPolyfill.needsCentering(this.dialog_)) {
        dialogPolyfill.reposition(this.dialog_);
        this.replacedStyleTop_ = true;
      } else {
        this.replacedStyleTop_ = false;
      }

      // Insert backdrop.
      this.backdrop_.addEventListener('click', this.backdropClick_);
      this.dialog_.parentNode.insertBefore(this.backdrop_, this.dialog_.nextSibling);

      // Find element with `autofocus` attribute or first form control.
      var target = this.dialog_.querySelector('[autofocus]:not([disabled])');
      if (!target) {
        // TODO: technically this is 'any focusable area'
        var opts = ['button', 'input', 'keygen', 'select', 'textarea'];
        var query = opts.map(function (el) {
          return el + ':not([disabled])';
        }).join(', ');
        target = this.dialog_.querySelector(query);
      }
      safeBlur(document.activeElement);
      target && target.focus();
    },

    /**
     * Closes this HTMLDialogElement. This is optional vs clearing the open
     * attribute, however this fires a 'close' event.
     *
     * @param {string=} opt_returnValue to use as the returnValue
     */
    close: function close(opt_returnValue) {
      if (!this.dialog_.hasAttribute('open')) {
        throw new Error('Failed to execute \'close\' on dialog: The element does not have an \'open\' attribute, and therefore cannot be closed.');
      }
      this.setOpen(false);

      // Leave returnValue untouched in case it was set directly on the element
      if (opt_returnValue !== undefined) {
        this.dialog_.returnValue = opt_returnValue;
      }

      // Triggering "close" event for any attached listeners on the <dialog>.
      var closeEvent = new supportCustomEvent('close', {
        bubbles: false,
        cancelable: false
      });
      this.dialog_.dispatchEvent(closeEvent);
    }

  };

  var dialogPolyfill = {};

  dialogPolyfill.reposition = function (element) {
    var scrollTop = document.body.scrollTop || document.documentElement.scrollTop;
    var topValue = scrollTop + (window.innerHeight - element.offsetHeight) / 2;
    element.style.top = Math.max(scrollTop, topValue) + 'px';
  };

  dialogPolyfill.isInlinePositionSetByStylesheet = function (element) {
    for (var i = 0; i < document.styleSheets.length; ++i) {
      var styleSheet = document.styleSheets[i];
      var cssRules = null;
      // Some browsers throw on cssRules.
      try {
        cssRules = styleSheet.cssRules;
      } catch (e) {}
      if (!cssRules) continue;
      for (var j = 0; j < cssRules.length; ++j) {
        var rule = cssRules[j];
        var selectedNodes = null;
        // Ignore errors on invalid selector texts.
        try {
          selectedNodes = document.querySelectorAll(rule.selectorText);
        } catch (e) {}
        if (!selectedNodes || !inNodeList(selectedNodes, element)) continue;
        var cssTop = rule.style.getPropertyValue('top');
        var cssBottom = rule.style.getPropertyValue('bottom');
        if (cssTop && cssTop != 'auto' || cssBottom && cssBottom != 'auto') return true;
      }
    }
    return false;
  };

  dialogPolyfill.needsCentering = function (dialog) {
    var computedStyle = window.getComputedStyle(dialog);
    if (computedStyle.position != 'absolute') {
      return false;
    }

    // We must determine whether the top/bottom specified value is non-auto.  In
    // WebKit/Blink, checking computedStyle.top == 'auto' is sufficient, but
    // Firefox returns the used value. So we do this crazy thing instead: check
    // the inline style and then go through CSS rules.
    if (dialog.style.top != 'auto' && dialog.style.top != '' || dialog.style.bottom != 'auto' && dialog.style.bottom != '') return false;
    return !dialogPolyfill.isInlinePositionSetByStylesheet(dialog);
  };

  /**
   * @param {!Element} element to force upgrade
   */
  dialogPolyfill.forceRegisterDialog = function (element) {
    if (element.showModal) {
      console.warn('This browser already supports <dialog>, the polyfill ' + 'may not work correctly', element);
    }
    if (element.nodeName.toUpperCase() != 'DIALOG') {
      throw new Error('Failed to register dialog: The element is not a dialog.');
    }
    new dialogPolyfillInfo( /** @type {!HTMLDialogElement} */element);
  };

  /**
   * @param {!Element} element to upgrade
   */
  dialogPolyfill.registerDialog = function (element) {
    if (element.showModal) {
      console.warn('Can\'t upgrade <dialog>: already supported', element);
    } else {
      dialogPolyfill.forceRegisterDialog(element);
    }
  };

  /**
   * @constructor
   */
  dialogPolyfill.DialogManager = function () {
    /** @type {!Array<!dialogPolyfillInfo>} */
    this.pendingDialogStack = [];

    // The overlay is used to simulate how a modal dialog blocks the document.
    // The blocking dialog is positioned on top of the overlay, and the rest of
    // the dialogs on the pending dialog stack are positioned below it. In the
    // actual implementation, the modal dialog stacking is controlled by the
    // top layer, where z-index has no effect.
    this.overlay = document.createElement('div');
    this.overlay.className = '_dialog_overlay';
    this.overlay.addEventListener('click', function (e) {
      e.stopPropagation();
    });

    this.handleKey_ = this.handleKey_.bind(this);
    this.handleFocus_ = this.handleFocus_.bind(this);
    this.handleRemove_ = this.handleRemove_.bind(this);

    this.zIndexLow_ = 100000;
    this.zIndexHigh_ = 100000 + 150;
  };

  /**
   * @return {Element} the top HTML dialog element, if any
   */
  dialogPolyfill.DialogManager.prototype.topDialogElement = function () {
    if (this.pendingDialogStack.length) {
      var t = this.pendingDialogStack[this.pendingDialogStack.length - 1];
      return t.dialog;
    }
    return null;
  };

  /**
   * Called on the first modal dialog being shown. Adds the overlay and related
   * handlers.
   */
  dialogPolyfill.DialogManager.prototype.blockDocument = function () {
    document.body.appendChild(this.overlay);
    document.body.addEventListener('focus', this.handleFocus_, true);
    document.addEventListener('keydown', this.handleKey_);
    document.addEventListener('DOMNodeRemoved', this.handleRemove_);
  };

  /**
   * Called on the first modal dialog being removed, i.e., when no more modal
   * dialogs are visible.
   */
  dialogPolyfill.DialogManager.prototype.unblockDocument = function () {
    document.body.removeChild(this.overlay);
    document.body.removeEventListener('focus', this.handleFocus_, true);
    document.removeEventListener('keydown', this.handleKey_);
    document.removeEventListener('DOMNodeRemoved', this.handleRemove_);
  };

  dialogPolyfill.DialogManager.prototype.updateStacking = function () {
    var zIndex = this.zIndexLow_;

    for (var i = 0; i < this.pendingDialogStack.length; i++) {
      if (i == this.pendingDialogStack.length - 1) {
        this.overlay.style.zIndex = zIndex++;
      }
      this.pendingDialogStack[i].updateZIndex(zIndex++, zIndex++);
    }
  };

  dialogPolyfill.DialogManager.prototype.handleFocus_ = function (event) {
    var candidate = findNearestDialog( /** @type {Element} */event.target);
    if (candidate != this.topDialogElement()) {
      event.preventDefault();
      event.stopPropagation();
      safeBlur( /** @type {Element} */event.target);
      // TODO: Focus on the browser chrome (aka document) or the dialog itself
      // depending on the tab direction.
      return false;
    }
  };

  dialogPolyfill.DialogManager.prototype.handleKey_ = function (event) {
    if (event.keyCode == 27) {
      event.preventDefault();
      event.stopPropagation();
      var cancelEvent = new supportCustomEvent('cancel', {
        bubbles: false,
        cancelable: true
      });
      var dialog = this.topDialogElement();
      if (dialog.dispatchEvent(cancelEvent)) {
        dialog.close();
      }
    }
  };

  dialogPolyfill.DialogManager.prototype.handleRemove_ = function (event) {
    if (event.target.nodeName.toUpperCase() != 'DIALOG') {
      return;
    }

    var dialog = /** @type {HTMLDialogElement} */event.target;
    if (!dialog.open) {
      return;
    }

    // Find a dialogPolyfillInfo which matches the removed <dialog>.
    this.pendingDialogStack.some(function (dpi) {
      if (dpi.dialog == dialog) {
        // This call will clear the dialogPolyfillInfo on this DialogManager
        // as a side effect.
        dpi.maybeHideModal();
        return true;
      }
    });
  };

  /**
   * @param {!dialogPolyfillInfo} dpi
   * @return {boolean} whether the dialog was allowed
   */
  dialogPolyfill.DialogManager.prototype.pushDialog = function (dpi) {
    var allowed = (this.zIndexHigh_ - this.zIndexLow_) / 2 - 1;
    if (this.pendingDialogStack.length >= allowed) {
      return false;
    }
    this.pendingDialogStack.push(dpi);
    if (this.pendingDialogStack.length == 1) {
      this.blockDocument();
    }
    this.updateStacking();
    return true;
  };

  /**
   * @param {dialogPolyfillInfo} dpi
   */
  dialogPolyfill.DialogManager.prototype.removeDialog = function (dpi) {
    var index = this.pendingDialogStack.indexOf(dpi);
    if (index == -1) {
      return;
    }

    this.pendingDialogStack.splice(index, 1);
    this.updateStacking();
    if (this.pendingDialogStack.length == 0) {
      this.unblockDocument();
    }
  };

  dialogPolyfill.dm = new dialogPolyfill.DialogManager();

  /**
   * Global form 'dialog' method handler. Closes a dialog correctly on submit
   * and possibly sets its return value.
   */
  document.addEventListener('submit', function (ev) {
    var target = ev.target;
    if (!target || !target.hasAttribute('method')) {
      return;
    }
    if (target.getAttribute('method').toLowerCase() != 'dialog') {
      return;
    }
    ev.preventDefault();

    var dialog = findNearestDialog( /** @type {Element} */ev.target);
    if (!dialog) {
      return;
    }

    // FIXME: The original event doesn't contain the element used to submit the
    // form (if any). Look in some possible places.
    var returnValue;
    var cands = [document.activeElement, ev.explicitOriginalTarget];
    var els = ['BUTTON', 'INPUT'];
    cands.some(function (cand) {
      if (cand && cand.form == ev.target && els.indexOf(cand.nodeName.toUpperCase()) != -1) {
        returnValue = cand.value;
        return true;
      }
    });
    dialog.close(returnValue);
  }, true);

  dialogPolyfill['forceRegisterDialog'] = dialogPolyfill.forceRegisterDialog;
  dialogPolyfill['registerDialog'] = dialogPolyfill.registerDialog;

  if ((typeof module === 'undefined' ? 'undefined' : _typeof(module)) === 'object' && _typeof(module['exports']) === 'object') {
    // CommonJS support
    module['exports'] = dialogPolyfill;
  } else if (typeof define === 'function' && 'amd' in define) {
    // AMD support
    define(function () {
      return dialogPolyfill;
    });
  } else {
    // all others
    window['dialogPolyfill'] = dialogPolyfill;
  }
})();
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

  // Register the Contact Modal
  (function registerModal() {
    var dialog = document.querySelector('dialog');
    var showDialogButtons = document.querySelectorAll('.show-dialog');
    var drawerButton = document.querySelector('.mdl-layout__drawer-button');

    // Check for 'dialog' element support in browser - Register if not
    if (!dialog.showModal) {
      dialogPolyfill.registerDialog(dialog);
    }

    // Show the modal on click of "Contact" link
    showDialogButtons.forEach(function (el, idx) {
      el.addEventListener('click', function () {
        // If the drawer is open, close it first
        if (document.querySelector('.is-visible')) {
          drawerButton.click();
          dialog.showModal();
        } else {
          dialog.showModal();
        }
      });
    });

    // Close the modal
    dialog.querySelector('.close').addEventListener('click', function () {
      dialog.close();
    });
  })();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1hdGVyaWFsLmpzIiwiZGlhbG9nLXBvbHlmaWxsLmpzIiwiYXBwLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3Y0SEEsQ0FBQyxZQUFXOztBQUVWLE1BQUkscUJBQXFCLE9BQU8sV0FBaEM7QUFDQSxNQUFJLENBQUMsa0JBQUQsSUFBdUIsUUFBTyxrQkFBUCx5Q0FBTyxrQkFBUCxNQUE2QixRQUF4RCxFQUFrRTtBQUNoRSx5QkFBcUIsU0FBUyxXQUFULENBQXFCLEtBQXJCLEVBQTRCLENBQTVCLEVBQStCO0FBQ2xELFVBQUksS0FBSyxFQUFUO0FBQ0EsVUFBSSxLQUFLLFNBQVMsV0FBVCxDQUFxQixhQUFyQixDQUFUO0FBQ0EsU0FBRyxlQUFILENBQW1CLEtBQW5CLEVBQTBCLENBQUMsQ0FBQyxFQUFFLE9BQTlCLEVBQXVDLENBQUMsQ0FBQyxFQUFFLFVBQTNDLEVBQXVELEVBQUUsTUFBRixJQUFZLElBQW5FO0FBQ0EsYUFBTyxFQUFQO0FBQ0QsS0FMRDtBQU1BLHVCQUFtQixTQUFuQixHQUErQixPQUFPLEtBQVAsQ0FBYSxTQUE1QztBQUNEOzs7Ozs7OztBQVFELFdBQVMsaUJBQVQsQ0FBMkIsRUFBM0IsRUFBK0I7QUFDN0IsV0FBTyxFQUFQLEVBQVc7QUFDVCxVQUFJLEdBQUcsUUFBSCxDQUFZLFdBQVosTUFBNkIsUUFBakMsRUFBMkM7QUFDekMsZ0RBQXlDO0FBQXpDO0FBQ0Q7QUFDRCxXQUFLLEdBQUcsYUFBUjtBQUNEO0FBQ0QsV0FBTyxJQUFQO0FBQ0Q7Ozs7Ozs7OztBQVNELFdBQVMsUUFBVCxDQUFrQixFQUFsQixFQUFzQjtBQUNwQixRQUFJLE1BQU0sR0FBRyxJQUFULElBQWlCLE1BQU0sU0FBUyxJQUFwQyxFQUEwQztBQUN4QyxTQUFHLElBQUg7QUFDRDtBQUNGOzs7Ozs7O0FBT0QsV0FBUyxVQUFULENBQW9CLFFBQXBCLEVBQThCLElBQTlCLEVBQW9DO0FBQ2xDLFNBQUssSUFBSSxJQUFJLENBQWIsRUFBZ0IsSUFBSSxTQUFTLE1BQTdCLEVBQXFDLEVBQUUsQ0FBdkMsRUFBMEM7QUFDeEMsVUFBSSxTQUFTLENBQVQsS0FBZSxJQUFuQixFQUF5QjtBQUN2QixlQUFPLElBQVA7QUFDRDtBQUNGO0FBQ0QsV0FBTyxLQUFQO0FBQ0Q7Ozs7OztBQU1ELFdBQVMsa0JBQVQsQ0FBNEIsTUFBNUIsRUFBb0M7QUFDbEMsU0FBSyxPQUFMLEdBQWUsTUFBZjtBQUNBLFNBQUssaUJBQUwsR0FBeUIsS0FBekI7QUFDQSxTQUFLLFlBQUwsR0FBb0IsS0FBcEI7OztBQUdBLFFBQUksQ0FBQyxPQUFPLFlBQVAsQ0FBb0IsTUFBcEIsQ0FBTCxFQUFrQztBQUNoQyxhQUFPLFlBQVAsQ0FBb0IsTUFBcEIsRUFBNEIsUUFBNUI7QUFDRDs7QUFFRCxXQUFPLElBQVAsR0FBYyxLQUFLLElBQUwsQ0FBVSxJQUFWLENBQWUsSUFBZixDQUFkO0FBQ0EsV0FBTyxTQUFQLEdBQW1CLEtBQUssU0FBTCxDQUFlLElBQWYsQ0FBb0IsSUFBcEIsQ0FBbkI7QUFDQSxXQUFPLEtBQVAsR0FBZSxLQUFLLEtBQUwsQ0FBVyxJQUFYLENBQWdCLElBQWhCLENBQWY7O0FBRUEsUUFBSSxFQUFFLGlCQUFpQixNQUFuQixDQUFKLEVBQWdDO0FBQzlCLGFBQU8sV0FBUCxHQUFxQixFQUFyQjtBQUNEOztBQUVELFNBQUssY0FBTCxHQUFzQixLQUFLLGNBQUwsQ0FBb0IsSUFBcEIsQ0FBeUIsSUFBekIsQ0FBdEI7QUFDQSxRQUFJLHNCQUFzQixNQUExQixFQUFrQzs7QUFFaEMsVUFBSSxLQUFLLElBQUksZ0JBQUosQ0FBcUIsS0FBSyxjQUExQixDQUFUO0FBQ0EsU0FBRyxPQUFILENBQVcsTUFBWCxFQUFtQixFQUFFLFlBQVksSUFBZCxFQUFvQixpQkFBaUIsQ0FBQyxNQUFELENBQXJDLEVBQW5CO0FBQ0QsS0FKRCxNQUlPO0FBQ0wsYUFBTyxnQkFBUCxDQUF3QixpQkFBeEIsRUFBMkMsS0FBSyxjQUFoRDtBQUNEOzs7O0FBSUQsV0FBTyxjQUFQLENBQXNCLE1BQXRCLEVBQThCLE1BQTlCLEVBQXNDO0FBQ3BDLFdBQUssS0FBSyxPQUFMLENBQWEsSUFBYixDQUFrQixJQUFsQixDQUQrQjtBQUVwQyxXQUFLLE9BQU8sWUFBUCxDQUFvQixJQUFwQixDQUF5QixNQUF6QixFQUFpQyxNQUFqQztBQUYrQixLQUF0Qzs7QUFLQSxTQUFLLFNBQUwsR0FBaUIsU0FBUyxhQUFULENBQXVCLEtBQXZCLENBQWpCO0FBQ0EsU0FBSyxTQUFMLENBQWUsU0FBZixHQUEyQixVQUEzQjtBQUNBLFNBQUssY0FBTCxHQUFzQixLQUFLLGNBQUwsQ0FBb0IsSUFBcEIsQ0FBeUIsSUFBekIsQ0FBdEI7QUFDRDs7QUFFRCxxQkFBbUIsU0FBbkIsR0FBK0I7O0FBRTdCLFFBQUksTUFBSixHQUFhO0FBQ1gsYUFBTyxLQUFLLE9BQVo7QUFDRCxLQUo0Qjs7Ozs7OztBQVc3QixvQkFBZ0IsMEJBQVc7QUFDekIsVUFBSSxDQUFDLEtBQUssWUFBVixFQUF3QjtBQUFFO0FBQVM7QUFDbkMsVUFBSSxLQUFLLE9BQUwsQ0FBYSxZQUFiLENBQTBCLE1BQTFCLEtBQ0EsU0FBUyxJQUFULENBQWMsUUFBZCxDQUF1QixLQUFLLE9BQTVCLENBREosRUFDMEM7QUFBRTtBQUFTOztBQUVyRCxXQUFLLFlBQUwsR0FBb0IsS0FBcEI7QUFDQSxXQUFLLE9BQUwsQ0FBYSxLQUFiLENBQW1CLE1BQW5CLEdBQTRCLEVBQTVCOzs7OztBQUtBLFVBQUksS0FBSyxpQkFBVCxFQUE0QjtBQUMxQixhQUFLLE9BQUwsQ0FBYSxLQUFiLENBQW1CLEdBQW5CLEdBQXlCLEVBQXpCO0FBQ0EsYUFBSyxpQkFBTCxHQUF5QixLQUF6QjtBQUNEOzs7QUFHRCxXQUFLLFNBQUwsQ0FBZSxtQkFBZixDQUFtQyxPQUFuQyxFQUE0QyxLQUFLLGNBQWpEO0FBQ0EsVUFBSSxLQUFLLFNBQUwsQ0FBZSxhQUFuQixFQUFrQztBQUNoQyxhQUFLLFNBQUwsQ0FBZSxhQUFmLENBQTZCLFdBQTdCLENBQXlDLEtBQUssU0FBOUM7QUFDRDtBQUNELHFCQUFlLEVBQWYsQ0FBa0IsWUFBbEIsQ0FBK0IsSUFBL0I7QUFDRCxLQWpDNEI7Ozs7O0FBc0M3QixhQUFTLGlCQUFTLEtBQVQsRUFBZ0I7QUFDdkIsVUFBSSxLQUFKLEVBQVc7QUFDVCxhQUFLLE9BQUwsQ0FBYSxZQUFiLENBQTBCLE1BQTFCLEtBQXFDLEtBQUssT0FBTCxDQUFhLFlBQWIsQ0FBMEIsTUFBMUIsRUFBa0MsRUFBbEMsQ0FBckM7QUFDRCxPQUZELE1BRU87QUFDTCxhQUFLLE9BQUwsQ0FBYSxlQUFiLENBQTZCLE1BQTdCO0FBQ0EsYUFBSyxjQUFMO0FBQ0Q7QUFDRixLQTdDNEI7Ozs7Ozs7O0FBcUQ3QixvQkFBZ0Isd0JBQVMsQ0FBVCxFQUFZO0FBQzFCLFVBQUksa0JBQWtCLFNBQVMsV0FBVCxDQUFxQixhQUFyQixDQUF0QjtBQUNBLHNCQUFnQixjQUFoQixDQUErQixFQUFFLElBQWpDLEVBQXVDLEVBQUUsT0FBekMsRUFBa0QsRUFBRSxVQUFwRCxFQUFnRSxNQUFoRSxFQUNJLEVBQUUsTUFETixFQUNjLEVBQUUsT0FEaEIsRUFDeUIsRUFBRSxPQUQzQixFQUNvQyxFQUFFLE9BRHRDLEVBQytDLEVBQUUsT0FEakQsRUFDMEQsRUFBRSxPQUQ1RCxFQUVJLEVBQUUsTUFGTixFQUVjLEVBQUUsUUFGaEIsRUFFMEIsRUFBRSxPQUY1QixFQUVxQyxFQUFFLE1BRnZDLEVBRStDLEVBQUUsYUFGakQ7QUFHQSxXQUFLLE9BQUwsQ0FBYSxhQUFiLENBQTJCLGVBQTNCO0FBQ0EsUUFBRSxlQUFGO0FBQ0QsS0E1RDRCOzs7Ozs7OztBQW9FN0Isa0JBQWMsc0JBQVMsU0FBVCxFQUFvQixPQUFwQixFQUE2QjtBQUN6QyxXQUFLLFNBQUwsQ0FBZSxLQUFmLENBQXFCLE1BQXJCLEdBQThCLFNBQTlCO0FBQ0EsV0FBSyxPQUFMLENBQWEsS0FBYixDQUFtQixNQUFuQixHQUE0QixPQUE1QjtBQUNELEtBdkU0Qjs7Ozs7QUE0RTdCLFVBQU0sZ0JBQVc7QUFDZixXQUFLLE9BQUwsQ0FBYSxJQUFiO0FBQ0QsS0E5RTRCOzs7OztBQW1GN0IsZUFBVyxxQkFBVztBQUNwQixVQUFJLEtBQUssT0FBTCxDQUFhLFlBQWIsQ0FBMEIsTUFBMUIsQ0FBSixFQUF1QztBQUNyQyxjQUFNLElBQUksS0FBSixDQUFVLGlIQUFWLENBQU47QUFDRDtBQUNELFVBQUksQ0FBQyxTQUFTLElBQVQsQ0FBYyxRQUFkLENBQXVCLEtBQUssT0FBNUIsQ0FBTCxFQUEyQztBQUN6QyxjQUFNLElBQUksS0FBSixDQUFVLDhFQUFWLENBQU47QUFDRDtBQUNELFVBQUksQ0FBQyxlQUFlLEVBQWYsQ0FBa0IsVUFBbEIsQ0FBNkIsSUFBN0IsQ0FBTCxFQUF5QztBQUN2QyxjQUFNLElBQUksS0FBSixDQUFVLG1GQUFWLENBQU47QUFDRDtBQUNELFdBQUssSUFBTDtBQUNBLFdBQUssWUFBTCxHQUFvQixJQUFwQjs7O0FBR0EsVUFBSSxlQUFlLGNBQWYsQ0FBOEIsS0FBSyxPQUFuQyxDQUFKLEVBQWlEO0FBQy9DLHVCQUFlLFVBQWYsQ0FBMEIsS0FBSyxPQUEvQjtBQUNBLGFBQUssaUJBQUwsR0FBeUIsSUFBekI7QUFDRCxPQUhELE1BR087QUFDTCxhQUFLLGlCQUFMLEdBQXlCLEtBQXpCO0FBQ0Q7OztBQUdELFdBQUssU0FBTCxDQUFlLGdCQUFmLENBQWdDLE9BQWhDLEVBQXlDLEtBQUssY0FBOUM7QUFDQSxXQUFLLE9BQUwsQ0FBYSxVQUFiLENBQXdCLFlBQXhCLENBQXFDLEtBQUssU0FBMUMsRUFDSSxLQUFLLE9BQUwsQ0FBYSxXQURqQjs7O0FBSUEsVUFBSSxTQUFTLEtBQUssT0FBTCxDQUFhLGFBQWIsQ0FBMkIsNkJBQTNCLENBQWI7QUFDQSxVQUFJLENBQUMsTUFBTCxFQUFhOztBQUVYLFlBQUksT0FBTyxDQUFDLFFBQUQsRUFBVyxPQUFYLEVBQW9CLFFBQXBCLEVBQThCLFFBQTlCLEVBQXdDLFVBQXhDLENBQVg7QUFDQSxZQUFJLFFBQVEsS0FBSyxHQUFMLENBQVMsVUFBUyxFQUFULEVBQWE7QUFDaEMsaUJBQU8sS0FBSyxrQkFBWjtBQUNELFNBRlcsRUFFVCxJQUZTLENBRUosSUFGSSxDQUFaO0FBR0EsaUJBQVMsS0FBSyxPQUFMLENBQWEsYUFBYixDQUEyQixLQUEzQixDQUFUO0FBQ0Q7QUFDRCxlQUFTLFNBQVMsYUFBbEI7QUFDQSxnQkFBVSxPQUFPLEtBQVAsRUFBVjtBQUNELEtBekg0Qjs7Ozs7Ozs7QUFpSTdCLFdBQU8sZUFBUyxlQUFULEVBQTBCO0FBQy9CLFVBQUksQ0FBQyxLQUFLLE9BQUwsQ0FBYSxZQUFiLENBQTBCLE1BQTFCLENBQUwsRUFBd0M7QUFDdEMsY0FBTSxJQUFJLEtBQUosQ0FBVSx5SEFBVixDQUFOO0FBQ0Q7QUFDRCxXQUFLLE9BQUwsQ0FBYSxLQUFiOzs7QUFHQSxVQUFJLG9CQUFvQixTQUF4QixFQUFtQztBQUNqQyxhQUFLLE9BQUwsQ0FBYSxXQUFiLEdBQTJCLGVBQTNCO0FBQ0Q7OztBQUdELFVBQUksYUFBYSxJQUFJLGtCQUFKLENBQXVCLE9BQXZCLEVBQWdDO0FBQy9DLGlCQUFTLEtBRHNDO0FBRS9DLG9CQUFZO0FBRm1DLE9BQWhDLENBQWpCO0FBSUEsV0FBSyxPQUFMLENBQWEsYUFBYixDQUEyQixVQUEzQjtBQUNEOztBQWxKNEIsR0FBL0I7O0FBc0pBLE1BQUksaUJBQWlCLEVBQXJCOztBQUVBLGlCQUFlLFVBQWYsR0FBNEIsVUFBUyxPQUFULEVBQWtCO0FBQzVDLFFBQUksWUFBWSxTQUFTLElBQVQsQ0FBYyxTQUFkLElBQTJCLFNBQVMsZUFBVCxDQUF5QixTQUFwRTtBQUNBLFFBQUksV0FBVyxZQUFZLENBQUMsT0FBTyxXQUFQLEdBQXFCLFFBQVEsWUFBOUIsSUFBOEMsQ0FBekU7QUFDQSxZQUFRLEtBQVIsQ0FBYyxHQUFkLEdBQW9CLEtBQUssR0FBTCxDQUFTLFNBQVQsRUFBb0IsUUFBcEIsSUFBZ0MsSUFBcEQ7QUFDRCxHQUpEOztBQU1BLGlCQUFlLCtCQUFmLEdBQWlELFVBQVMsT0FBVCxFQUFrQjtBQUNqRSxTQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksU0FBUyxXQUFULENBQXFCLE1BQXpDLEVBQWlELEVBQUUsQ0FBbkQsRUFBc0Q7QUFDcEQsVUFBSSxhQUFhLFNBQVMsV0FBVCxDQUFxQixDQUFyQixDQUFqQjtBQUNBLFVBQUksV0FBVyxJQUFmOztBQUVBLFVBQUk7QUFDRixtQkFBVyxXQUFXLFFBQXRCO0FBQ0QsT0FGRCxDQUVFLE9BQU8sQ0FBUCxFQUFVLENBQUU7QUFDZCxVQUFJLENBQUMsUUFBTCxFQUNFO0FBQ0YsV0FBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLFNBQVMsTUFBN0IsRUFBcUMsRUFBRSxDQUF2QyxFQUEwQztBQUN4QyxZQUFJLE9BQU8sU0FBUyxDQUFULENBQVg7QUFDQSxZQUFJLGdCQUFnQixJQUFwQjs7QUFFQSxZQUFJO0FBQ0YsMEJBQWdCLFNBQVMsZ0JBQVQsQ0FBMEIsS0FBSyxZQUEvQixDQUFoQjtBQUNELFNBRkQsQ0FFRSxPQUFNLENBQU4sRUFBUyxDQUFFO0FBQ2IsWUFBSSxDQUFDLGFBQUQsSUFBa0IsQ0FBQyxXQUFXLGFBQVgsRUFBMEIsT0FBMUIsQ0FBdkIsRUFDRTtBQUNGLFlBQUksU0FBUyxLQUFLLEtBQUwsQ0FBVyxnQkFBWCxDQUE0QixLQUE1QixDQUFiO0FBQ0EsWUFBSSxZQUFZLEtBQUssS0FBTCxDQUFXLGdCQUFYLENBQTRCLFFBQTVCLENBQWhCO0FBQ0EsWUFBSyxVQUFVLFVBQVUsTUFBckIsSUFBaUMsYUFBYSxhQUFhLE1BQS9ELEVBQ0UsT0FBTyxJQUFQO0FBQ0g7QUFDRjtBQUNELFdBQU8sS0FBUDtBQUNELEdBMUJEOztBQTRCQSxpQkFBZSxjQUFmLEdBQWdDLFVBQVMsTUFBVCxFQUFpQjtBQUMvQyxRQUFJLGdCQUFnQixPQUFPLGdCQUFQLENBQXdCLE1BQXhCLENBQXBCO0FBQ0EsUUFBSSxjQUFjLFFBQWQsSUFBMEIsVUFBOUIsRUFBMEM7QUFDeEMsYUFBTyxLQUFQO0FBQ0Q7Ozs7OztBQU1ELFFBQUssT0FBTyxLQUFQLENBQWEsR0FBYixJQUFvQixNQUFwQixJQUE4QixPQUFPLEtBQVAsQ0FBYSxHQUFiLElBQW9CLEVBQW5ELElBQ0MsT0FBTyxLQUFQLENBQWEsTUFBYixJQUF1QixNQUF2QixJQUFpQyxPQUFPLEtBQVAsQ0FBYSxNQUFiLElBQXVCLEVBRDdELEVBRUUsT0FBTyxLQUFQO0FBQ0YsV0FBTyxDQUFDLGVBQWUsK0JBQWYsQ0FBK0MsTUFBL0MsQ0FBUjtBQUNELEdBZEQ7Ozs7O0FBbUJBLGlCQUFlLG1CQUFmLEdBQXFDLFVBQVMsT0FBVCxFQUFrQjtBQUNyRCxRQUFJLFFBQVEsU0FBWixFQUF1QjtBQUNyQixjQUFRLElBQVIsQ0FBYSwwREFDVCx3QkFESixFQUM4QixPQUQ5QjtBQUVEO0FBQ0QsUUFBSSxRQUFRLFFBQVIsQ0FBaUIsV0FBakIsTUFBa0MsUUFBdEMsRUFBZ0Q7QUFDOUMsWUFBTSxJQUFJLEtBQUosQ0FBVSx5REFBVixDQUFOO0FBQ0Q7QUFDRCxRQUFJLGtCQUFKLG1DQUEwRCxPQUExRDtBQUNELEdBVEQ7Ozs7O0FBY0EsaUJBQWUsY0FBZixHQUFnQyxVQUFTLE9BQVQsRUFBa0I7QUFDaEQsUUFBSSxRQUFRLFNBQVosRUFBdUI7QUFDckIsY0FBUSxJQUFSLENBQWEsNENBQWIsRUFBMkQsT0FBM0Q7QUFDRCxLQUZELE1BRU87QUFDTCxxQkFBZSxtQkFBZixDQUFtQyxPQUFuQztBQUNEO0FBQ0YsR0FORDs7Ozs7QUFXQSxpQkFBZSxhQUFmLEdBQStCLFlBQVc7O0FBRXhDLFNBQUssa0JBQUwsR0FBMEIsRUFBMUI7Ozs7Ozs7QUFPQSxTQUFLLE9BQUwsR0FBZSxTQUFTLGFBQVQsQ0FBdUIsS0FBdkIsQ0FBZjtBQUNBLFNBQUssT0FBTCxDQUFhLFNBQWIsR0FBeUIsaUJBQXpCO0FBQ0EsU0FBSyxPQUFMLENBQWEsZ0JBQWIsQ0FBOEIsT0FBOUIsRUFBdUMsVUFBUyxDQUFULEVBQVk7QUFDakQsUUFBRSxlQUFGO0FBQ0QsS0FGRDs7QUFJQSxTQUFLLFVBQUwsR0FBa0IsS0FBSyxVQUFMLENBQWdCLElBQWhCLENBQXFCLElBQXJCLENBQWxCO0FBQ0EsU0FBSyxZQUFMLEdBQW9CLEtBQUssWUFBTCxDQUFrQixJQUFsQixDQUF1QixJQUF2QixDQUFwQjtBQUNBLFNBQUssYUFBTCxHQUFxQixLQUFLLGFBQUwsQ0FBbUIsSUFBbkIsQ0FBd0IsSUFBeEIsQ0FBckI7O0FBRUEsU0FBSyxVQUFMLEdBQWtCLE1BQWxCO0FBQ0EsU0FBSyxXQUFMLEdBQW1CLFNBQVMsR0FBNUI7QUFDRCxHQXJCRDs7Ozs7QUEwQkEsaUJBQWUsYUFBZixDQUE2QixTQUE3QixDQUF1QyxnQkFBdkMsR0FBMEQsWUFBVztBQUNuRSxRQUFJLEtBQUssa0JBQUwsQ0FBd0IsTUFBNUIsRUFBb0M7QUFDbEMsVUFBSSxJQUFJLEtBQUssa0JBQUwsQ0FBd0IsS0FBSyxrQkFBTCxDQUF3QixNQUF4QixHQUFpQyxDQUF6RCxDQUFSO0FBQ0EsYUFBTyxFQUFFLE1BQVQ7QUFDRDtBQUNELFdBQU8sSUFBUDtBQUNELEdBTkQ7Ozs7OztBQVlBLGlCQUFlLGFBQWYsQ0FBNkIsU0FBN0IsQ0FBdUMsYUFBdkMsR0FBdUQsWUFBVztBQUNoRSxhQUFTLElBQVQsQ0FBYyxXQUFkLENBQTBCLEtBQUssT0FBL0I7QUFDQSxhQUFTLElBQVQsQ0FBYyxnQkFBZCxDQUErQixPQUEvQixFQUF3QyxLQUFLLFlBQTdDLEVBQTJELElBQTNEO0FBQ0EsYUFBUyxnQkFBVCxDQUEwQixTQUExQixFQUFxQyxLQUFLLFVBQTFDO0FBQ0EsYUFBUyxnQkFBVCxDQUEwQixnQkFBMUIsRUFBNEMsS0FBSyxhQUFqRDtBQUNELEdBTEQ7Ozs7OztBQVdBLGlCQUFlLGFBQWYsQ0FBNkIsU0FBN0IsQ0FBdUMsZUFBdkMsR0FBeUQsWUFBVztBQUNsRSxhQUFTLElBQVQsQ0FBYyxXQUFkLENBQTBCLEtBQUssT0FBL0I7QUFDQSxhQUFTLElBQVQsQ0FBYyxtQkFBZCxDQUFrQyxPQUFsQyxFQUEyQyxLQUFLLFlBQWhELEVBQThELElBQTlEO0FBQ0EsYUFBUyxtQkFBVCxDQUE2QixTQUE3QixFQUF3QyxLQUFLLFVBQTdDO0FBQ0EsYUFBUyxtQkFBVCxDQUE2QixnQkFBN0IsRUFBK0MsS0FBSyxhQUFwRDtBQUNELEdBTEQ7O0FBT0EsaUJBQWUsYUFBZixDQUE2QixTQUE3QixDQUF1QyxjQUF2QyxHQUF3RCxZQUFXO0FBQ2pFLFFBQUksU0FBUyxLQUFLLFVBQWxCOztBQUVBLFNBQUssSUFBSSxJQUFJLENBQWIsRUFBZ0IsSUFBSSxLQUFLLGtCQUFMLENBQXdCLE1BQTVDLEVBQW9ELEdBQXBELEVBQXlEO0FBQ3ZELFVBQUksS0FBSyxLQUFLLGtCQUFMLENBQXdCLE1BQXhCLEdBQWlDLENBQTFDLEVBQTZDO0FBQzNDLGFBQUssT0FBTCxDQUFhLEtBQWIsQ0FBbUIsTUFBbkIsR0FBNEIsUUFBNUI7QUFDRDtBQUNELFdBQUssa0JBQUwsQ0FBd0IsQ0FBeEIsRUFBMkIsWUFBM0IsQ0FBd0MsUUFBeEMsRUFBa0QsUUFBbEQ7QUFDRDtBQUNGLEdBVEQ7O0FBV0EsaUJBQWUsYUFBZixDQUE2QixTQUE3QixDQUF1QyxZQUF2QyxHQUFzRCxVQUFTLEtBQVQsRUFBZ0I7QUFDcEUsUUFBSSxZQUFZLHlDQUEwQyxNQUFNLE1BQWhELENBQWhCO0FBQ0EsUUFBSSxhQUFhLEtBQUssZ0JBQUwsRUFBakIsRUFBMEM7QUFDeEMsWUFBTSxjQUFOO0FBQ0EsWUFBTSxlQUFOO0FBQ0Esc0NBQWlDLE1BQU0sTUFBdkM7OztBQUdBLGFBQU8sS0FBUDtBQUNEO0FBQ0YsR0FWRDs7QUFZQSxpQkFBZSxhQUFmLENBQTZCLFNBQTdCLENBQXVDLFVBQXZDLEdBQW9ELFVBQVMsS0FBVCxFQUFnQjtBQUNsRSxRQUFJLE1BQU0sT0FBTixJQUFpQixFQUFyQixFQUF5QjtBQUN2QixZQUFNLGNBQU47QUFDQSxZQUFNLGVBQU47QUFDQSxVQUFJLGNBQWMsSUFBSSxrQkFBSixDQUF1QixRQUF2QixFQUFpQztBQUNqRCxpQkFBUyxLQUR3QztBQUVqRCxvQkFBWTtBQUZxQyxPQUFqQyxDQUFsQjtBQUlBLFVBQUksU0FBUyxLQUFLLGdCQUFMLEVBQWI7QUFDQSxVQUFJLE9BQU8sYUFBUCxDQUFxQixXQUFyQixDQUFKLEVBQXVDO0FBQ3JDLGVBQU8sS0FBUDtBQUNEO0FBQ0Y7QUFDRixHQWJEOztBQWVBLGlCQUFlLGFBQWYsQ0FBNkIsU0FBN0IsQ0FBdUMsYUFBdkMsR0FBdUQsVUFBUyxLQUFULEVBQWdCO0FBQ3JFLFFBQUksTUFBTSxNQUFOLENBQWEsUUFBYixDQUFzQixXQUF0QixNQUF1QyxRQUEzQyxFQUFxRDtBQUFFO0FBQVM7O0FBRWhFLFFBQUkseUNBQTJDLE1BQU0sTUFBckQ7QUFDQSxRQUFJLENBQUMsT0FBTyxJQUFaLEVBQWtCO0FBQUU7QUFBUzs7O0FBRzdCLFNBQUssa0JBQUwsQ0FBd0IsSUFBeEIsQ0FBNkIsVUFBUyxHQUFULEVBQWM7QUFDekMsVUFBSSxJQUFJLE1BQUosSUFBYyxNQUFsQixFQUEwQjs7O0FBR3hCLFlBQUksY0FBSjtBQUNBLGVBQU8sSUFBUDtBQUNEO0FBQ0YsS0FQRDtBQVFELEdBZkQ7Ozs7OztBQXFCQSxpQkFBZSxhQUFmLENBQTZCLFNBQTdCLENBQXVDLFVBQXZDLEdBQW9ELFVBQVMsR0FBVCxFQUFjO0FBQ2hFLFFBQUksVUFBVSxDQUFDLEtBQUssV0FBTCxHQUFtQixLQUFLLFVBQXpCLElBQXVDLENBQXZDLEdBQTJDLENBQXpEO0FBQ0EsUUFBSSxLQUFLLGtCQUFMLENBQXdCLE1BQXhCLElBQWtDLE9BQXRDLEVBQStDO0FBQzdDLGFBQU8sS0FBUDtBQUNEO0FBQ0QsU0FBSyxrQkFBTCxDQUF3QixJQUF4QixDQUE2QixHQUE3QjtBQUNBLFFBQUksS0FBSyxrQkFBTCxDQUF3QixNQUF4QixJQUFrQyxDQUF0QyxFQUF5QztBQUN2QyxXQUFLLGFBQUw7QUFDRDtBQUNELFNBQUssY0FBTDtBQUNBLFdBQU8sSUFBUDtBQUNELEdBWEQ7Ozs7O0FBZ0JBLGlCQUFlLGFBQWYsQ0FBNkIsU0FBN0IsQ0FBdUMsWUFBdkMsR0FBc0QsVUFBUyxHQUFULEVBQWM7QUFDbEUsUUFBSSxRQUFRLEtBQUssa0JBQUwsQ0FBd0IsT0FBeEIsQ0FBZ0MsR0FBaEMsQ0FBWjtBQUNBLFFBQUksU0FBUyxDQUFDLENBQWQsRUFBaUI7QUFBRTtBQUFTOztBQUU1QixTQUFLLGtCQUFMLENBQXdCLE1BQXhCLENBQStCLEtBQS9CLEVBQXNDLENBQXRDO0FBQ0EsU0FBSyxjQUFMO0FBQ0EsUUFBSSxLQUFLLGtCQUFMLENBQXdCLE1BQXhCLElBQWtDLENBQXRDLEVBQXlDO0FBQ3ZDLFdBQUssZUFBTDtBQUNEO0FBQ0YsR0FURDs7QUFXQSxpQkFBZSxFQUFmLEdBQW9CLElBQUksZUFBZSxhQUFuQixFQUFwQjs7Ozs7O0FBTUEsV0FBUyxnQkFBVCxDQUEwQixRQUExQixFQUFvQyxVQUFTLEVBQVQsRUFBYTtBQUMvQyxRQUFJLFNBQVMsR0FBRyxNQUFoQjtBQUNBLFFBQUksQ0FBQyxNQUFELElBQVcsQ0FBQyxPQUFPLFlBQVAsQ0FBb0IsUUFBcEIsQ0FBaEIsRUFBK0M7QUFBRTtBQUFTO0FBQzFELFFBQUksT0FBTyxZQUFQLENBQW9CLFFBQXBCLEVBQThCLFdBQTlCLE1BQStDLFFBQW5ELEVBQTZEO0FBQUU7QUFBUztBQUN4RSxPQUFHLGNBQUg7O0FBRUEsUUFBSSxTQUFTLHlDQUEwQyxHQUFHLE1BQTdDLENBQWI7QUFDQSxRQUFJLENBQUMsTUFBTCxFQUFhO0FBQUU7QUFBUzs7OztBQUl4QixRQUFJLFdBQUo7QUFDQSxRQUFJLFFBQVEsQ0FBQyxTQUFTLGFBQVYsRUFBeUIsR0FBRyxzQkFBNUIsQ0FBWjtBQUNBLFFBQUksTUFBTSxDQUFDLFFBQUQsRUFBVyxPQUFYLENBQVY7QUFDQSxVQUFNLElBQU4sQ0FBVyxVQUFTLElBQVQsRUFBZTtBQUN4QixVQUFJLFFBQVEsS0FBSyxJQUFMLElBQWEsR0FBRyxNQUF4QixJQUFrQyxJQUFJLE9BQUosQ0FBWSxLQUFLLFFBQUwsQ0FBYyxXQUFkLEVBQVosS0FBNEMsQ0FBQyxDQUFuRixFQUFzRjtBQUNwRixzQkFBYyxLQUFLLEtBQW5CO0FBQ0EsZUFBTyxJQUFQO0FBQ0Q7QUFDRixLQUxEO0FBTUEsV0FBTyxLQUFQLENBQWEsV0FBYjtBQUNELEdBckJELEVBcUJHLElBckJIOztBQXVCQSxpQkFBZSxxQkFBZixJQUF3QyxlQUFlLG1CQUF2RDtBQUNBLGlCQUFlLGdCQUFmLElBQW1DLGVBQWUsY0FBbEQ7O0FBRUEsTUFBSSxRQUFPLE1BQVAseUNBQU8sTUFBUCxPQUFrQixRQUFsQixJQUE4QixRQUFPLE9BQU8sU0FBUCxDQUFQLE1BQTZCLFFBQS9ELEVBQXlFOztBQUV2RSxXQUFPLFNBQVAsSUFBb0IsY0FBcEI7QUFDRCxHQUhELE1BR08sSUFBSSxPQUFPLE1BQVAsS0FBa0IsVUFBbEIsSUFBZ0MsU0FBUyxNQUE3QyxFQUFxRDs7QUFFMUQsV0FBTyxZQUFXO0FBQUUsYUFBTyxjQUFQO0FBQXdCLEtBQTVDO0FBQ0QsR0FITSxNQUdBOztBQUVMLFdBQU8sZ0JBQVAsSUFBMkIsY0FBM0I7QUFDRDtBQUNGLENBamdCRDs7OztBQ0NBLE9BQU8sZ0JBQVAsQ0FBd0IsTUFBeEIsRUFBZ0MsWUFBVztBQUN6Qzs7QUFFQSxNQUFJLFlBQVksU0FBUyxhQUFULENBQXVCLHdCQUF2QixDQUFoQjtBQUNBLE1BQUksU0FBUyxTQUFTLGFBQVQsQ0FBdUIscUJBQXZCLENBQWI7QUFDQSxNQUFJLGVBQWUsU0FBUyxhQUFULENBQXVCLDRCQUF2QixDQUFuQjtBQUNBLE1BQUksYUFBYSxTQUFTLGFBQVQsQ0FBdUIseUJBQXZCLENBQWpCOzs7O0FBSUEsU0FBTyxnQkFBUCxDQUF3QixTQUF4QixFQUFtQyxVQUFTLEdBQVQsRUFBYztBQUMvQyxRQUFJLElBQUksT0FBSixLQUFnQixFQUFoQixJQUFzQixPQUFPLFNBQVAsQ0FBaUIsUUFBakIsQ0FBMEIsWUFBMUIsQ0FBMUIsRUFBbUU7QUFDakU7QUFDQTtBQUNEO0FBQ0YsR0FMRDs7QUFPQSxXQUFTLFdBQVQsR0FBdUI7QUFDckIsV0FBTyxTQUFQLEdBQW1CLG9CQUFuQjtBQUNBLGVBQVcsU0FBWCxHQUF1Qix3QkFBdkI7QUFDRDs7Ozs7QUFLRCxlQUFhLGdCQUFiLENBQThCLE9BQTlCLEVBQXVDLFlBQVc7QUFDaEQ7QUFDRCxHQUZEOztBQUlBLGVBQWEsZ0JBQWIsQ0FBOEIsU0FBOUIsRUFBeUMsVUFBUyxHQUFULEVBQWM7OztBQUdyRCxRQUFJLElBQUksT0FBSixLQUFnQixFQUFoQixJQUFzQixJQUFJLE9BQUosS0FBZ0IsRUFBMUMsRUFBOEM7QUFDNUM7QUFDRDtBQUNGLEdBTkQ7OztBQVNBLGFBQVcsZ0JBQVgsQ0FBNEIsT0FBNUIsRUFBcUMsWUFBVztBQUM5QztBQUNELEdBRkQ7Ozs7OztBQVdBLE1BQUksV0FBVyxTQUFTLGFBQVQsQ0FBdUIseUJBQXZCLENBQWY7QUFDQSxNQUFJLFVBQVUsU0FBUyxhQUFULENBQXVCLHdCQUF2QixDQUFkO0FBQ0EsTUFBSSxlQUFlLFNBQVMsYUFBVCxDQUF1QixrREFBdkIsQ0FBbkI7QUFDQSxNQUFJLGNBQWMsUUFBUSxzQkFBUixDQUErQixzQkFBL0IsQ0FBbEI7QUFDQSxNQUFJLGNBQWMsT0FBTyxzQkFBUCxDQUE4QixzQkFBOUIsQ0FBbEI7OztBQUdBLGlCQUFlLFdBQWYsRUFBNEIsSUFBNUI7OztBQUdBLFdBQVMseUJBQVQsR0FBcUM7QUFDbkMsUUFBSSxTQUFTLFlBQVQsQ0FBc0IsYUFBdEIsTUFBeUMsT0FBN0MsRUFBc0Q7O0FBRXBELGVBQVMsWUFBVCxDQUFzQixhQUF0QixFQUFxQyxNQUFyQztBQUNBLGNBQVEsWUFBUixDQUFxQixhQUFyQixFQUFvQyxNQUFwQzs7O0FBR0EscUJBQWUsV0FBZixFQUE0QixJQUE1QjtBQUNBLHFCQUFlLFdBQWYsRUFBNEIsR0FBNUI7QUFDRCxLQVJELE1BUU87O0FBRUwsZUFBUyxZQUFULENBQXNCLGFBQXRCLEVBQXFDLE9BQXJDO0FBQ0EsY0FBUSxZQUFSLENBQXFCLGFBQXJCLEVBQW9DLE9BQXBDOztBQUVBLG1CQUFhLFlBQWIsQ0FBMEIsYUFBMUIsRUFBeUMsTUFBekM7O0FBRUEscUJBQWUsV0FBZixFQUE0QixHQUE1QjtBQUNBLHFCQUFlLFdBQWYsRUFBNEIsSUFBNUI7QUFDRDs7QUFFRjs7QUFFRCxXQUFTLGNBQVQsQ0FBd0IsR0FBeEIsRUFBNkIsR0FBN0IsRUFBa0M7QUFDaEMsU0FBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLElBQUksTUFBeEIsRUFBZ0MsR0FBaEMsRUFBcUM7QUFDbkMsVUFBSSxDQUFKLEVBQU8sWUFBUCxDQUFvQixVQUFwQixFQUFnQyxHQUFoQztBQUNEO0FBQ0Y7OztBQUdELEdBQUMsU0FBUyxhQUFULEdBQXlCO0FBQ3hCLFFBQUksU0FBUyxTQUFTLGFBQVQsQ0FBdUIsUUFBdkIsQ0FBYjtBQUNBLFFBQUksb0JBQW9CLFNBQVMsZ0JBQVQsQ0FBMEIsY0FBMUIsQ0FBeEI7QUFDQSxRQUFJLGVBQWUsU0FBUyxhQUFULENBQXVCLDRCQUF2QixDQUFuQjs7O0FBR0EsUUFBSSxDQUFDLE9BQU8sU0FBWixFQUF1QjtBQUNyQixxQkFBZSxjQUFmLENBQThCLE1BQTlCO0FBQ0Q7OztBQUdELHNCQUFrQixPQUFsQixDQUEwQixVQUFTLEVBQVQsRUFBYSxHQUFiLEVBQWtCO0FBQzFDLFNBQUcsZ0JBQUgsQ0FBb0IsT0FBcEIsRUFBNkIsWUFBVzs7QUFFdEMsWUFBSSxTQUFTLGFBQVQsQ0FBdUIsYUFBdkIsQ0FBSixFQUEyQztBQUN6Qyx1QkFBYSxLQUFiO0FBQ0EsaUJBQU8sU0FBUDtBQUNELFNBSEQsTUFHTztBQUNMLGlCQUFPLFNBQVA7QUFDRDtBQUNGLE9BUkQ7QUFTRCxLQVZEOzs7QUFhQSxXQUFPLGFBQVAsQ0FBcUIsUUFBckIsRUFBK0IsZ0JBQS9CLENBQWdELE9BQWhELEVBQXlELFlBQVc7QUFDbEUsYUFBTyxLQUFQO0FBQ0QsS0FGRDtBQUdELEdBM0JEO0FBNEJELENBcEhEIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpIHtcblwidXNlIHN0cmljdFwiO1xuXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNSBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuLyoqXG4gKiBBIGNvbXBvbmVudCBoYW5kbGVyIGludGVyZmFjZSB1c2luZyB0aGUgcmV2ZWFsaW5nIG1vZHVsZSBkZXNpZ24gcGF0dGVybi5cbiAqIE1vcmUgZGV0YWlscyBvbiB0aGlzIGRlc2lnbiBwYXR0ZXJuIGhlcmU6XG4gKiBodHRwczovL2dpdGh1Yi5jb20vamFzb25tYXllcy9tZGwtY29tcG9uZW50LWRlc2lnbi1wYXR0ZXJuXG4gKlxuICogQGF1dGhvciBKYXNvbiBNYXllcy5cbiAqL1xuLyogZXhwb3J0ZWQgY29tcG9uZW50SGFuZGxlciAqL1xuXG4vLyBQcmUtZGVmaW5pbmcgdGhlIGNvbXBvbmVudEhhbmRsZXIgaW50ZXJmYWNlLCBmb3IgY2xvc3VyZSBkb2N1bWVudGF0aW9uIGFuZFxuLy8gc3RhdGljIHZlcmlmaWNhdGlvbi5cbnZhciBjb21wb25lbnRIYW5kbGVyID0ge1xuICAvKipcbiAgICogU2VhcmNoZXMgZXhpc3RpbmcgRE9NIGZvciBlbGVtZW50cyBvZiBvdXIgY29tcG9uZW50IHR5cGUgYW5kIHVwZ3JhZGVzIHRoZW1cbiAgICogaWYgdGhleSBoYXZlIG5vdCBhbHJlYWR5IGJlZW4gdXBncmFkZWQuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nPX0gb3B0SnNDbGFzcyB0aGUgcHJvZ3JhbWF0aWMgbmFtZSBvZiB0aGUgZWxlbWVudCBjbGFzcyB3ZVxuICAgKiBuZWVkIHRvIGNyZWF0ZSBhIG5ldyBpbnN0YW5jZSBvZi5cbiAgICogQHBhcmFtIHtzdHJpbmc9fSBvcHRDc3NDbGFzcyB0aGUgbmFtZSBvZiB0aGUgQ1NTIGNsYXNzIGVsZW1lbnRzIG9mIHRoaXNcbiAgICogdHlwZSB3aWxsIGhhdmUuXG4gICAqL1xuICB1cGdyYWRlRG9tOiBmdW5jdGlvbihvcHRKc0NsYXNzLCBvcHRDc3NDbGFzcykge30sXG4gIC8qKlxuICAgKiBVcGdyYWRlcyBhIHNwZWNpZmljIGVsZW1lbnQgcmF0aGVyIHRoYW4gYWxsIGluIHRoZSBET00uXG4gICAqXG4gICAqIEBwYXJhbSB7IUVsZW1lbnR9IGVsZW1lbnQgVGhlIGVsZW1lbnQgd2Ugd2lzaCB0byB1cGdyYWRlLlxuICAgKiBAcGFyYW0ge3N0cmluZz19IG9wdEpzQ2xhc3MgT3B0aW9uYWwgbmFtZSBvZiB0aGUgY2xhc3Mgd2Ugd2FudCB0byB1cGdyYWRlXG4gICAqIHRoZSBlbGVtZW50IHRvLlxuICAgKi9cbiAgdXBncmFkZUVsZW1lbnQ6IGZ1bmN0aW9uKGVsZW1lbnQsIG9wdEpzQ2xhc3MpIHt9LFxuICAvKipcbiAgICogVXBncmFkZXMgYSBzcGVjaWZpYyBsaXN0IG9mIGVsZW1lbnRzIHJhdGhlciB0aGFuIGFsbCBpbiB0aGUgRE9NLlxuICAgKlxuICAgKiBAcGFyYW0geyFFbGVtZW50fCFBcnJheTwhRWxlbWVudD58IU5vZGVMaXN0fCFIVE1MQ29sbGVjdGlvbn0gZWxlbWVudHNcbiAgICogVGhlIGVsZW1lbnRzIHdlIHdpc2ggdG8gdXBncmFkZS5cbiAgICovXG4gIHVwZ3JhZGVFbGVtZW50czogZnVuY3Rpb24oZWxlbWVudHMpIHt9LFxuICAvKipcbiAgICogVXBncmFkZXMgYWxsIHJlZ2lzdGVyZWQgY29tcG9uZW50cyBmb3VuZCBpbiB0aGUgY3VycmVudCBET00uIFRoaXMgaXNcbiAgICogYXV0b21hdGljYWxseSBjYWxsZWQgb24gd2luZG93IGxvYWQuXG4gICAqL1xuICB1cGdyYWRlQWxsUmVnaXN0ZXJlZDogZnVuY3Rpb24oKSB7fSxcbiAgLyoqXG4gICAqIEFsbG93cyB1c2VyIHRvIGJlIGFsZXJ0ZWQgdG8gYW55IHVwZ3JhZGVzIHRoYXQgYXJlIHBlcmZvcm1lZCBmb3IgYSBnaXZlblxuICAgKiBjb21wb25lbnQgdHlwZVxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30ganNDbGFzcyBUaGUgY2xhc3MgbmFtZSBvZiB0aGUgTURMIGNvbXBvbmVudCB3ZSB3aXNoXG4gICAqIHRvIGhvb2sgaW50byBmb3IgYW55IHVwZ3JhZGVzIHBlcmZvcm1lZC5cbiAgICogQHBhcmFtIHtmdW5jdGlvbighSFRNTEVsZW1lbnQpfSBjYWxsYmFjayBUaGUgZnVuY3Rpb24gdG8gY2FsbCB1cG9uIGFuXG4gICAqIHVwZ3JhZGUuIFRoaXMgZnVuY3Rpb24gc2hvdWxkIGV4cGVjdCAxIHBhcmFtZXRlciAtIHRoZSBIVE1MRWxlbWVudCB3aGljaFxuICAgKiBnb3QgdXBncmFkZWQuXG4gICAqL1xuICByZWdpc3RlclVwZ3JhZGVkQ2FsbGJhY2s6IGZ1bmN0aW9uKGpzQ2xhc3MsIGNhbGxiYWNrKSB7fSxcbiAgLyoqXG4gICAqIFJlZ2lzdGVycyBhIGNsYXNzIGZvciBmdXR1cmUgdXNlIGFuZCBhdHRlbXB0cyB0byB1cGdyYWRlIGV4aXN0aW5nIERPTS5cbiAgICpcbiAgICogQHBhcmFtIHtjb21wb25lbnRIYW5kbGVyLkNvbXBvbmVudENvbmZpZ1B1YmxpY30gY29uZmlnIHRoZSByZWdpc3RyYXRpb24gY29uZmlndXJhdGlvblxuICAgKi9cbiAgcmVnaXN0ZXI6IGZ1bmN0aW9uKGNvbmZpZykge30sXG4gIC8qKlxuICAgKiBEb3duZ3JhZGUgZWl0aGVyIGEgZ2l2ZW4gbm9kZSwgYW4gYXJyYXkgb2Ygbm9kZXMsIG9yIGEgTm9kZUxpc3QuXG4gICAqXG4gICAqIEBwYXJhbSB7IU5vZGV8IUFycmF5PCFOb2RlPnwhTm9kZUxpc3R9IG5vZGVzXG4gICAqL1xuICBkb3duZ3JhZGVFbGVtZW50czogZnVuY3Rpb24obm9kZXMpIHt9XG59O1xuXG5jb21wb25lbnRIYW5kbGVyID0gKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLyoqIEB0eXBlIHshQXJyYXk8Y29tcG9uZW50SGFuZGxlci5Db21wb25lbnRDb25maWc+fSAqL1xuICB2YXIgcmVnaXN0ZXJlZENvbXBvbmVudHNfID0gW107XG5cbiAgLyoqIEB0eXBlIHshQXJyYXk8Y29tcG9uZW50SGFuZGxlci5Db21wb25lbnQ+fSAqL1xuICB2YXIgY3JlYXRlZENvbXBvbmVudHNfID0gW107XG5cbiAgdmFyIGNvbXBvbmVudENvbmZpZ1Byb3BlcnR5XyA9ICdtZGxDb21wb25lbnRDb25maWdJbnRlcm5hbF8nO1xuXG4gIC8qKlxuICAgKiBTZWFyY2hlcyByZWdpc3RlcmVkIGNvbXBvbmVudHMgZm9yIGEgY2xhc3Mgd2UgYXJlIGludGVyZXN0ZWQgaW4gdXNpbmcuXG4gICAqIE9wdGlvbmFsbHkgcmVwbGFjZXMgYSBtYXRjaCB3aXRoIHBhc3NlZCBvYmplY3QgaWYgc3BlY2lmaWVkLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBUaGUgbmFtZSBvZiBhIGNsYXNzIHdlIHdhbnQgdG8gdXNlLlxuICAgKiBAcGFyYW0ge2NvbXBvbmVudEhhbmRsZXIuQ29tcG9uZW50Q29uZmlnPX0gb3B0UmVwbGFjZSBPcHRpb25hbCBvYmplY3QgdG8gcmVwbGFjZSBtYXRjaCB3aXRoLlxuICAgKiBAcmV0dXJuIHshT2JqZWN0fGJvb2xlYW59XG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBmaW5kUmVnaXN0ZXJlZENsYXNzXyhuYW1lLCBvcHRSZXBsYWNlKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZWdpc3RlcmVkQ29tcG9uZW50c18ubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChyZWdpc3RlcmVkQ29tcG9uZW50c19baV0uY2xhc3NOYW1lID09PSBuYW1lKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygb3B0UmVwbGFjZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICByZWdpc3RlcmVkQ29tcG9uZW50c19baV0gPSBvcHRSZXBsYWNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZWdpc3RlcmVkQ29tcG9uZW50c19baV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGFuIGFycmF5IG9mIHRoZSBjbGFzc05hbWVzIG9mIHRoZSB1cGdyYWRlZCBjbGFzc2VzIG9uIHRoZSBlbGVtZW50LlxuICAgKlxuICAgKiBAcGFyYW0geyFFbGVtZW50fSBlbGVtZW50IFRoZSBlbGVtZW50IHRvIGZldGNoIGRhdGEgZnJvbS5cbiAgICogQHJldHVybiB7IUFycmF5PHN0cmluZz59XG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBnZXRVcGdyYWRlZExpc3RPZkVsZW1lbnRfKGVsZW1lbnQpIHtcbiAgICB2YXIgZGF0YVVwZ3JhZGVkID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2RhdGEtdXBncmFkZWQnKTtcbiAgICAvLyBVc2UgYFsnJ11gIGFzIGRlZmF1bHQgdmFsdWUgdG8gY29uZm9ybSB0aGUgYCxuYW1lLG5hbWUuLi5gIHN0eWxlLlxuICAgIHJldHVybiBkYXRhVXBncmFkZWQgPT09IG51bGwgPyBbJyddIDogZGF0YVVwZ3JhZGVkLnNwbGl0KCcsJyk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0cnVlIGlmIHRoZSBnaXZlbiBlbGVtZW50IGhhcyBhbHJlYWR5IGJlZW4gdXBncmFkZWQgZm9yIHRoZSBnaXZlblxuICAgKiBjbGFzcy5cbiAgICpcbiAgICogQHBhcmFtIHshRWxlbWVudH0gZWxlbWVudCBUaGUgZWxlbWVudCB3ZSB3YW50IHRvIGNoZWNrLlxuICAgKiBAcGFyYW0ge3N0cmluZ30ganNDbGFzcyBUaGUgY2xhc3MgdG8gY2hlY2sgZm9yLlxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIGlzRWxlbWVudFVwZ3JhZGVkXyhlbGVtZW50LCBqc0NsYXNzKSB7XG4gICAgdmFyIHVwZ3JhZGVkTGlzdCA9IGdldFVwZ3JhZGVkTGlzdE9mRWxlbWVudF8oZWxlbWVudCk7XG4gICAgcmV0dXJuIHVwZ3JhZGVkTGlzdC5pbmRleE9mKGpzQ2xhc3MpICE9PSAtMTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZWFyY2hlcyBleGlzdGluZyBET00gZm9yIGVsZW1lbnRzIG9mIG91ciBjb21wb25lbnQgdHlwZSBhbmQgdXBncmFkZXMgdGhlbVxuICAgKiBpZiB0aGV5IGhhdmUgbm90IGFscmVhZHkgYmVlbiB1cGdyYWRlZC5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmc9fSBvcHRKc0NsYXNzIHRoZSBwcm9ncmFtYXRpYyBuYW1lIG9mIHRoZSBlbGVtZW50IGNsYXNzIHdlXG4gICAqIG5lZWQgdG8gY3JlYXRlIGEgbmV3IGluc3RhbmNlIG9mLlxuICAgKiBAcGFyYW0ge3N0cmluZz19IG9wdENzc0NsYXNzIHRoZSBuYW1lIG9mIHRoZSBDU1MgY2xhc3MgZWxlbWVudHMgb2YgdGhpc1xuICAgKiB0eXBlIHdpbGwgaGF2ZS5cbiAgICovXG4gIGZ1bmN0aW9uIHVwZ3JhZGVEb21JbnRlcm5hbChvcHRKc0NsYXNzLCBvcHRDc3NDbGFzcykge1xuICAgIGlmICh0eXBlb2Ygb3B0SnNDbGFzcyA9PT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgICAgdHlwZW9mIG9wdENzc0NsYXNzID09PSAndW5kZWZpbmVkJykge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZWdpc3RlcmVkQ29tcG9uZW50c18ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdXBncmFkZURvbUludGVybmFsKHJlZ2lzdGVyZWRDb21wb25lbnRzX1tpXS5jbGFzc05hbWUsXG4gICAgICAgICAgICByZWdpc3RlcmVkQ29tcG9uZW50c19baV0uY3NzQ2xhc3MpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIganNDbGFzcyA9IC8qKiBAdHlwZSB7c3RyaW5nfSAqLyAob3B0SnNDbGFzcyk7XG4gICAgICBpZiAodHlwZW9mIG9wdENzc0NsYXNzID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICB2YXIgcmVnaXN0ZXJlZENsYXNzID0gZmluZFJlZ2lzdGVyZWRDbGFzc18oanNDbGFzcyk7XG4gICAgICAgIGlmIChyZWdpc3RlcmVkQ2xhc3MpIHtcbiAgICAgICAgICBvcHRDc3NDbGFzcyA9IHJlZ2lzdGVyZWRDbGFzcy5jc3NDbGFzcztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgZWxlbWVudHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuJyArIG9wdENzc0NsYXNzKTtcbiAgICAgIGZvciAodmFyIG4gPSAwOyBuIDwgZWxlbWVudHMubGVuZ3RoOyBuKyspIHtcbiAgICAgICAgdXBncmFkZUVsZW1lbnRJbnRlcm5hbChlbGVtZW50c1tuXSwganNDbGFzcyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFVwZ3JhZGVzIGEgc3BlY2lmaWMgZWxlbWVudCByYXRoZXIgdGhhbiBhbGwgaW4gdGhlIERPTS5cbiAgICpcbiAgICogQHBhcmFtIHshRWxlbWVudH0gZWxlbWVudCBUaGUgZWxlbWVudCB3ZSB3aXNoIHRvIHVwZ3JhZGUuXG4gICAqIEBwYXJhbSB7c3RyaW5nPX0gb3B0SnNDbGFzcyBPcHRpb25hbCBuYW1lIG9mIHRoZSBjbGFzcyB3ZSB3YW50IHRvIHVwZ3JhZGVcbiAgICogdGhlIGVsZW1lbnQgdG8uXG4gICAqL1xuICBmdW5jdGlvbiB1cGdyYWRlRWxlbWVudEludGVybmFsKGVsZW1lbnQsIG9wdEpzQ2xhc3MpIHtcbiAgICAvLyBWZXJpZnkgYXJndW1lbnQgdHlwZS5cbiAgICBpZiAoISh0eXBlb2YgZWxlbWVudCA9PT0gJ29iamVjdCcgJiYgZWxlbWVudCBpbnN0YW5jZW9mIEVsZW1lbnQpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgYXJndW1lbnQgcHJvdmlkZWQgdG8gdXBncmFkZSBNREwgZWxlbWVudC4nKTtcbiAgICB9XG4gICAgdmFyIHVwZ3JhZGVkTGlzdCA9IGdldFVwZ3JhZGVkTGlzdE9mRWxlbWVudF8oZWxlbWVudCk7XG4gICAgdmFyIGNsYXNzZXNUb1VwZ3JhZGUgPSBbXTtcbiAgICAvLyBJZiBqc0NsYXNzIGlzIG5vdCBwcm92aWRlZCBzY2FuIHRoZSByZWdpc3RlcmVkIGNvbXBvbmVudHMgdG8gZmluZCB0aGVcbiAgICAvLyBvbmVzIG1hdGNoaW5nIHRoZSBlbGVtZW50J3MgQ1NTIGNsYXNzTGlzdC5cbiAgICBpZiAoIW9wdEpzQ2xhc3MpIHtcbiAgICAgIHZhciBjbGFzc0xpc3QgPSBlbGVtZW50LmNsYXNzTGlzdDtcbiAgICAgIHJlZ2lzdGVyZWRDb21wb25lbnRzXy5mb3JFYWNoKGZ1bmN0aW9uKGNvbXBvbmVudCkge1xuICAgICAgICAvLyBNYXRjaCBDU1MgJiBOb3QgdG8gYmUgdXBncmFkZWQgJiBOb3QgdXBncmFkZWQuXG4gICAgICAgIGlmIChjbGFzc0xpc3QuY29udGFpbnMoY29tcG9uZW50LmNzc0NsYXNzKSAmJlxuICAgICAgICAgICAgY2xhc3Nlc1RvVXBncmFkZS5pbmRleE9mKGNvbXBvbmVudCkgPT09IC0xICYmXG4gICAgICAgICAgICAhaXNFbGVtZW50VXBncmFkZWRfKGVsZW1lbnQsIGNvbXBvbmVudC5jbGFzc05hbWUpKSB7XG4gICAgICAgICAgY2xhc3Nlc1RvVXBncmFkZS5wdXNoKGNvbXBvbmVudCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoIWlzRWxlbWVudFVwZ3JhZGVkXyhlbGVtZW50LCBvcHRKc0NsYXNzKSkge1xuICAgICAgY2xhc3Nlc1RvVXBncmFkZS5wdXNoKGZpbmRSZWdpc3RlcmVkQ2xhc3NfKG9wdEpzQ2xhc3MpKTtcbiAgICB9XG5cbiAgICAvLyBVcGdyYWRlIHRoZSBlbGVtZW50IGZvciBlYWNoIGNsYXNzZXMuXG4gICAgZm9yICh2YXIgaSA9IDAsIG4gPSBjbGFzc2VzVG9VcGdyYWRlLmxlbmd0aCwgcmVnaXN0ZXJlZENsYXNzOyBpIDwgbjsgaSsrKSB7XG4gICAgICByZWdpc3RlcmVkQ2xhc3MgPSBjbGFzc2VzVG9VcGdyYWRlW2ldO1xuICAgICAgaWYgKHJlZ2lzdGVyZWRDbGFzcykge1xuICAgICAgICAvLyBNYXJrIGVsZW1lbnQgYXMgdXBncmFkZWQuXG4gICAgICAgIHVwZ3JhZGVkTGlzdC5wdXNoKHJlZ2lzdGVyZWRDbGFzcy5jbGFzc05hbWUpO1xuICAgICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZSgnZGF0YS11cGdyYWRlZCcsIHVwZ3JhZGVkTGlzdC5qb2luKCcsJykpO1xuICAgICAgICB2YXIgaW5zdGFuY2UgPSBuZXcgcmVnaXN0ZXJlZENsYXNzLmNsYXNzQ29uc3RydWN0b3IoZWxlbWVudCk7XG4gICAgICAgIGluc3RhbmNlW2NvbXBvbmVudENvbmZpZ1Byb3BlcnR5X10gPSByZWdpc3RlcmVkQ2xhc3M7XG4gICAgICAgIGNyZWF0ZWRDb21wb25lbnRzXy5wdXNoKGluc3RhbmNlKTtcbiAgICAgICAgLy8gQ2FsbCBhbnkgY2FsbGJhY2tzIHRoZSB1c2VyIGhhcyByZWdpc3RlcmVkIHdpdGggdGhpcyBjb21wb25lbnQgdHlwZS5cbiAgICAgICAgZm9yICh2YXIgaiA9IDAsIG0gPSByZWdpc3RlcmVkQ2xhc3MuY2FsbGJhY2tzLmxlbmd0aDsgaiA8IG07IGorKykge1xuICAgICAgICAgIHJlZ2lzdGVyZWRDbGFzcy5jYWxsYmFja3Nbal0oZWxlbWVudCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmVnaXN0ZXJlZENsYXNzLndpZGdldCkge1xuICAgICAgICAgIC8vIEFzc2lnbiBwZXIgZWxlbWVudCBpbnN0YW5jZSBmb3IgY29udHJvbCBvdmVyIEFQSVxuICAgICAgICAgIGVsZW1lbnRbcmVnaXN0ZXJlZENsYXNzLmNsYXNzTmFtZV0gPSBpbnN0YW5jZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICdVbmFibGUgdG8gZmluZCBhIHJlZ2lzdGVyZWQgY29tcG9uZW50IGZvciB0aGUgZ2l2ZW4gY2xhc3MuJyk7XG4gICAgICB9XG5cbiAgICAgIHZhciBldjtcbiAgICAgIGlmICgnQ3VzdG9tRXZlbnQnIGluIHdpbmRvdyAmJiB0eXBlb2Ygd2luZG93LkN1c3RvbUV2ZW50ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGV2ID0gbmV3IEV2ZW50KCdtZGwtY29tcG9uZW50dXBncmFkZWQnLCB7XG4gICAgICAgICAgJ2J1YmJsZXMnOiB0cnVlLCAnY2FuY2VsYWJsZSc6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXYgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnRzJyk7XG4gICAgICAgIGV2LmluaXRFdmVudCgnbWRsLWNvbXBvbmVudHVwZ3JhZGVkJywgdHJ1ZSwgdHJ1ZSk7XG4gICAgICB9XG4gICAgICBlbGVtZW50LmRpc3BhdGNoRXZlbnQoZXYpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBVcGdyYWRlcyBhIHNwZWNpZmljIGxpc3Qgb2YgZWxlbWVudHMgcmF0aGVyIHRoYW4gYWxsIGluIHRoZSBET00uXG4gICAqXG4gICAqIEBwYXJhbSB7IUVsZW1lbnR8IUFycmF5PCFFbGVtZW50PnwhTm9kZUxpc3R8IUhUTUxDb2xsZWN0aW9ufSBlbGVtZW50c1xuICAgKiBUaGUgZWxlbWVudHMgd2Ugd2lzaCB0byB1cGdyYWRlLlxuICAgKi9cbiAgZnVuY3Rpb24gdXBncmFkZUVsZW1lbnRzSW50ZXJuYWwoZWxlbWVudHMpIHtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoZWxlbWVudHMpKSB7XG4gICAgICBpZiAodHlwZW9mIGVsZW1lbnRzLml0ZW0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgZWxlbWVudHMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCgvKiogQHR5cGUge0FycmF5fSAqLyAoZWxlbWVudHMpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVsZW1lbnRzID0gW2VsZW1lbnRzXTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDAsIG4gPSBlbGVtZW50cy5sZW5ndGgsIGVsZW1lbnQ7IGkgPCBuOyBpKyspIHtcbiAgICAgIGVsZW1lbnQgPSBlbGVtZW50c1tpXTtcbiAgICAgIGlmIChlbGVtZW50IGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgdXBncmFkZUVsZW1lbnRJbnRlcm5hbChlbGVtZW50KTtcbiAgICAgICAgaWYgKGVsZW1lbnQuY2hpbGRyZW4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHVwZ3JhZGVFbGVtZW50c0ludGVybmFsKGVsZW1lbnQuY2hpbGRyZW4pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVycyBhIGNsYXNzIGZvciBmdXR1cmUgdXNlIGFuZCBhdHRlbXB0cyB0byB1cGdyYWRlIGV4aXN0aW5nIERPTS5cbiAgICpcbiAgICogQHBhcmFtIHtjb21wb25lbnRIYW5kbGVyLkNvbXBvbmVudENvbmZpZ1B1YmxpY30gY29uZmlnXG4gICAqL1xuICBmdW5jdGlvbiByZWdpc3RlckludGVybmFsKGNvbmZpZykge1xuICAgIC8vIEluIG9yZGVyIHRvIHN1cHBvcnQgYm90aCBDbG9zdXJlLWNvbXBpbGVkIGFuZCB1bmNvbXBpbGVkIGNvZGUgYWNjZXNzaW5nXG4gICAgLy8gdGhpcyBtZXRob2QsIHdlIG5lZWQgdG8gYWxsb3cgZm9yIGJvdGggdGhlIGRvdCBhbmQgYXJyYXkgc3ludGF4IGZvclxuICAgIC8vIHByb3BlcnR5IGFjY2Vzcy4gWW91J2xsIHRoZXJlZm9yZSBzZWUgdGhlIGBmb28uYmFyIHx8IGZvb1snYmFyJ11gXG4gICAgLy8gcGF0dGVybiByZXBlYXRlZCBhY3Jvc3MgdGhpcyBtZXRob2QuXG4gICAgdmFyIHdpZGdldE1pc3NpbmcgPSAodHlwZW9mIGNvbmZpZy53aWRnZXQgPT09ICd1bmRlZmluZWQnICYmXG4gICAgICAgIHR5cGVvZiBjb25maWdbJ3dpZGdldCddID09PSAndW5kZWZpbmVkJyk7XG4gICAgdmFyIHdpZGdldCA9IHRydWU7XG5cbiAgICBpZiAoIXdpZGdldE1pc3NpbmcpIHtcbiAgICAgIHdpZGdldCA9IGNvbmZpZy53aWRnZXQgfHwgY29uZmlnWyd3aWRnZXQnXTtcbiAgICB9XG5cbiAgICB2YXIgbmV3Q29uZmlnID0gLyoqIEB0eXBlIHtjb21wb25lbnRIYW5kbGVyLkNvbXBvbmVudENvbmZpZ30gKi8gKHtcbiAgICAgIGNsYXNzQ29uc3RydWN0b3I6IGNvbmZpZy5jb25zdHJ1Y3RvciB8fCBjb25maWdbJ2NvbnN0cnVjdG9yJ10sXG4gICAgICBjbGFzc05hbWU6IGNvbmZpZy5jbGFzc0FzU3RyaW5nIHx8IGNvbmZpZ1snY2xhc3NBc1N0cmluZyddLFxuICAgICAgY3NzQ2xhc3M6IGNvbmZpZy5jc3NDbGFzcyB8fCBjb25maWdbJ2Nzc0NsYXNzJ10sXG4gICAgICB3aWRnZXQ6IHdpZGdldCxcbiAgICAgIGNhbGxiYWNrczogW11cbiAgICB9KTtcblxuICAgIHJlZ2lzdGVyZWRDb21wb25lbnRzXy5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgIGlmIChpdGVtLmNzc0NsYXNzID09PSBuZXdDb25maWcuY3NzQ2xhc3MpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGUgcHJvdmlkZWQgY3NzQ2xhc3MgaGFzIGFscmVhZHkgYmVlbiByZWdpc3RlcmVkOiAnICsgaXRlbS5jc3NDbGFzcyk7XG4gICAgICB9XG4gICAgICBpZiAoaXRlbS5jbGFzc05hbWUgPT09IG5ld0NvbmZpZy5jbGFzc05hbWUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGUgcHJvdmlkZWQgY2xhc3NOYW1lIGhhcyBhbHJlYWR5IGJlZW4gcmVnaXN0ZXJlZCcpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKGNvbmZpZy5jb25zdHJ1Y3Rvci5wcm90b3R5cGVcbiAgICAgICAgLmhhc093blByb3BlcnR5KGNvbXBvbmVudENvbmZpZ1Byb3BlcnR5XykpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAnTURMIGNvbXBvbmVudCBjbGFzc2VzIG11c3Qgbm90IGhhdmUgJyArIGNvbXBvbmVudENvbmZpZ1Byb3BlcnR5XyArXG4gICAgICAgICAgJyBkZWZpbmVkIGFzIGEgcHJvcGVydHkuJyk7XG4gICAgfVxuXG4gICAgdmFyIGZvdW5kID0gZmluZFJlZ2lzdGVyZWRDbGFzc18oY29uZmlnLmNsYXNzQXNTdHJpbmcsIG5ld0NvbmZpZyk7XG5cbiAgICBpZiAoIWZvdW5kKSB7XG4gICAgICByZWdpc3RlcmVkQ29tcG9uZW50c18ucHVzaChuZXdDb25maWcpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBbGxvd3MgdXNlciB0byBiZSBhbGVydGVkIHRvIGFueSB1cGdyYWRlcyB0aGF0IGFyZSBwZXJmb3JtZWQgZm9yIGEgZ2l2ZW5cbiAgICogY29tcG9uZW50IHR5cGVcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGpzQ2xhc3MgVGhlIGNsYXNzIG5hbWUgb2YgdGhlIE1ETCBjb21wb25lbnQgd2Ugd2lzaFxuICAgKiB0byBob29rIGludG8gZm9yIGFueSB1cGdyYWRlcyBwZXJmb3JtZWQuXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb24oIUhUTUxFbGVtZW50KX0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRvIGNhbGwgdXBvbiBhblxuICAgKiB1cGdyYWRlLiBUaGlzIGZ1bmN0aW9uIHNob3VsZCBleHBlY3QgMSBwYXJhbWV0ZXIgLSB0aGUgSFRNTEVsZW1lbnQgd2hpY2hcbiAgICogZ290IHVwZ3JhZGVkLlxuICAgKi9cbiAgZnVuY3Rpb24gcmVnaXN0ZXJVcGdyYWRlZENhbGxiYWNrSW50ZXJuYWwoanNDbGFzcywgY2FsbGJhY2spIHtcbiAgICB2YXIgcmVnQ2xhc3MgPSBmaW5kUmVnaXN0ZXJlZENsYXNzXyhqc0NsYXNzKTtcbiAgICBpZiAocmVnQ2xhc3MpIHtcbiAgICAgIHJlZ0NsYXNzLmNhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVXBncmFkZXMgYWxsIHJlZ2lzdGVyZWQgY29tcG9uZW50cyBmb3VuZCBpbiB0aGUgY3VycmVudCBET00uIFRoaXMgaXNcbiAgICogYXV0b21hdGljYWxseSBjYWxsZWQgb24gd2luZG93IGxvYWQuXG4gICAqL1xuICBmdW5jdGlvbiB1cGdyYWRlQWxsUmVnaXN0ZXJlZEludGVybmFsKCkge1xuICAgIGZvciAodmFyIG4gPSAwOyBuIDwgcmVnaXN0ZXJlZENvbXBvbmVudHNfLmxlbmd0aDsgbisrKSB7XG4gICAgICB1cGdyYWRlRG9tSW50ZXJuYWwocmVnaXN0ZXJlZENvbXBvbmVudHNfW25dLmNsYXNzTmFtZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIHRoZSBjb21wb25lbnQgZm9yIHRoZSBkb3duZ3JhZGUgbWV0aG9kLlxuICAgKiBFeGVjdXRlIGlmIGZvdW5kLlxuICAgKiBSZW1vdmUgY29tcG9uZW50IGZyb20gY3JlYXRlZENvbXBvbmVudHMgbGlzdC5cbiAgICpcbiAgICogQHBhcmFtIHs/Y29tcG9uZW50SGFuZGxlci5Db21wb25lbnR9IGNvbXBvbmVudFxuICAgKi9cbiAgZnVuY3Rpb24gZGVjb25zdHJ1Y3RDb21wb25lbnRJbnRlcm5hbChjb21wb25lbnQpIHtcbiAgICBpZiAoY29tcG9uZW50KSB7XG4gICAgICB2YXIgY29tcG9uZW50SW5kZXggPSBjcmVhdGVkQ29tcG9uZW50c18uaW5kZXhPZihjb21wb25lbnQpO1xuICAgICAgY3JlYXRlZENvbXBvbmVudHNfLnNwbGljZShjb21wb25lbnRJbmRleCwgMSk7XG5cbiAgICAgIHZhciB1cGdyYWRlcyA9IGNvbXBvbmVudC5lbGVtZW50Xy5nZXRBdHRyaWJ1dGUoJ2RhdGEtdXBncmFkZWQnKS5zcGxpdCgnLCcpO1xuICAgICAgdmFyIGNvbXBvbmVudFBsYWNlID0gdXBncmFkZXMuaW5kZXhPZihjb21wb25lbnRbY29tcG9uZW50Q29uZmlnUHJvcGVydHlfXS5jbGFzc0FzU3RyaW5nKTtcbiAgICAgIHVwZ3JhZGVzLnNwbGljZShjb21wb25lbnRQbGFjZSwgMSk7XG4gICAgICBjb21wb25lbnQuZWxlbWVudF8uc2V0QXR0cmlidXRlKCdkYXRhLXVwZ3JhZGVkJywgdXBncmFkZXMuam9pbignLCcpKTtcblxuICAgICAgdmFyIGV2O1xuICAgICAgaWYgKCdDdXN0b21FdmVudCcgaW4gd2luZG93ICYmIHR5cGVvZiB3aW5kb3cuQ3VzdG9tRXZlbnQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgZXYgPSBuZXcgRXZlbnQoJ21kbC1jb21wb25lbnRkb3duZ3JhZGVkJywge1xuICAgICAgICAgICdidWJibGVzJzogdHJ1ZSwgJ2NhbmNlbGFibGUnOiBmYWxzZVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGV2ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50cycpO1xuICAgICAgICBldi5pbml0RXZlbnQoJ21kbC1jb21wb25lbnRkb3duZ3JhZGVkJywgdHJ1ZSwgdHJ1ZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIERvd25ncmFkZSBlaXRoZXIgYSBnaXZlbiBub2RlLCBhbiBhcnJheSBvZiBub2Rlcywgb3IgYSBOb2RlTGlzdC5cbiAgICpcbiAgICogQHBhcmFtIHshTm9kZXwhQXJyYXk8IU5vZGU+fCFOb2RlTGlzdH0gbm9kZXNcbiAgICovXG4gIGZ1bmN0aW9uIGRvd25ncmFkZU5vZGVzSW50ZXJuYWwobm9kZXMpIHtcbiAgICAvKipcbiAgICAgKiBBdXhpbGlhcnkgZnVuY3Rpb24gdG8gZG93bmdyYWRlIGEgc2luZ2xlIG5vZGUuXG4gICAgICogQHBhcmFtICB7IU5vZGV9IG5vZGUgdGhlIG5vZGUgdG8gYmUgZG93bmdyYWRlZFxuICAgICAqL1xuICAgIHZhciBkb3duZ3JhZGVOb2RlID0gZnVuY3Rpb24obm9kZSkge1xuICAgICAgY3JlYXRlZENvbXBvbmVudHNfLmZpbHRlcihmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIHJldHVybiBpdGVtLmVsZW1lbnRfID09PSBub2RlO1xuICAgICAgfSkuZm9yRWFjaChkZWNvbnN0cnVjdENvbXBvbmVudEludGVybmFsKTtcbiAgICB9O1xuICAgIGlmIChub2RlcyBpbnN0YW5jZW9mIEFycmF5IHx8IG5vZGVzIGluc3RhbmNlb2YgTm9kZUxpc3QpIHtcbiAgICAgIGZvciAodmFyIG4gPSAwOyBuIDwgbm9kZXMubGVuZ3RoOyBuKyspIHtcbiAgICAgICAgZG93bmdyYWRlTm9kZShub2Rlc1tuXSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChub2RlcyBpbnN0YW5jZW9mIE5vZGUpIHtcbiAgICAgIGRvd25ncmFkZU5vZGUobm9kZXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgYXJndW1lbnQgcHJvdmlkZWQgdG8gZG93bmdyYWRlIE1ETCBub2Rlcy4nKTtcbiAgICB9XG4gIH1cblxuICAvLyBOb3cgcmV0dXJuIHRoZSBmdW5jdGlvbnMgdGhhdCBzaG91bGQgYmUgbWFkZSBwdWJsaWMgd2l0aCB0aGVpciBwdWJsaWNseVxuICAvLyBmYWNpbmcgbmFtZXMuLi5cbiAgcmV0dXJuIHtcbiAgICB1cGdyYWRlRG9tOiB1cGdyYWRlRG9tSW50ZXJuYWwsXG4gICAgdXBncmFkZUVsZW1lbnQ6IHVwZ3JhZGVFbGVtZW50SW50ZXJuYWwsXG4gICAgdXBncmFkZUVsZW1lbnRzOiB1cGdyYWRlRWxlbWVudHNJbnRlcm5hbCxcbiAgICB1cGdyYWRlQWxsUmVnaXN0ZXJlZDogdXBncmFkZUFsbFJlZ2lzdGVyZWRJbnRlcm5hbCxcbiAgICByZWdpc3RlclVwZ3JhZGVkQ2FsbGJhY2s6IHJlZ2lzdGVyVXBncmFkZWRDYWxsYmFja0ludGVybmFsLFxuICAgIHJlZ2lzdGVyOiByZWdpc3RlckludGVybmFsLFxuICAgIGRvd25ncmFkZUVsZW1lbnRzOiBkb3duZ3JhZGVOb2Rlc0ludGVybmFsXG4gIH07XG59KSgpO1xuXG4vKipcbiAqIERlc2NyaWJlcyB0aGUgdHlwZSBvZiBhIHJlZ2lzdGVyZWQgY29tcG9uZW50IHR5cGUgbWFuYWdlZCBieVxuICogY29tcG9uZW50SGFuZGxlci4gUHJvdmlkZWQgZm9yIGJlbmVmaXQgb2YgdGhlIENsb3N1cmUgY29tcGlsZXIuXG4gKlxuICogQHR5cGVkZWYge3tcbiAqICAgY29uc3RydWN0b3I6IEZ1bmN0aW9uLFxuICogICBjbGFzc0FzU3RyaW5nOiBzdHJpbmcsXG4gKiAgIGNzc0NsYXNzOiBzdHJpbmcsXG4gKiAgIHdpZGdldDogKHN0cmluZ3xib29sZWFufHVuZGVmaW5lZClcbiAqIH19XG4gKi9cbmNvbXBvbmVudEhhbmRsZXIuQ29tcG9uZW50Q29uZmlnUHVibGljOyAgLy8ganNoaW50IGlnbm9yZTpsaW5lXG5cbi8qKlxuICogRGVzY3JpYmVzIHRoZSB0eXBlIG9mIGEgcmVnaXN0ZXJlZCBjb21wb25lbnQgdHlwZSBtYW5hZ2VkIGJ5XG4gKiBjb21wb25lbnRIYW5kbGVyLiBQcm92aWRlZCBmb3IgYmVuZWZpdCBvZiB0aGUgQ2xvc3VyZSBjb21waWxlci5cbiAqXG4gKiBAdHlwZWRlZiB7e1xuICogICBjb25zdHJ1Y3RvcjogIUZ1bmN0aW9uLFxuICogICBjbGFzc05hbWU6IHN0cmluZyxcbiAqICAgY3NzQ2xhc3M6IHN0cmluZyxcbiAqICAgd2lkZ2V0OiAoc3RyaW5nfGJvb2xlYW4pLFxuICogICBjYWxsYmFja3M6ICFBcnJheTxmdW5jdGlvbighSFRNTEVsZW1lbnQpPlxuICogfX1cbiAqL1xuY29tcG9uZW50SGFuZGxlci5Db21wb25lbnRDb25maWc7ICAvLyBqc2hpbnQgaWdub3JlOmxpbmVcblxuLyoqXG4gKiBDcmVhdGVkIGNvbXBvbmVudCAoaS5lLiwgdXBncmFkZWQgZWxlbWVudCkgdHlwZSBhcyBtYW5hZ2VkIGJ5XG4gKiBjb21wb25lbnRIYW5kbGVyLiBQcm92aWRlZCBmb3IgYmVuZWZpdCBvZiB0aGUgQ2xvc3VyZSBjb21waWxlci5cbiAqXG4gKiBAdHlwZWRlZiB7e1xuICogICBlbGVtZW50XzogIUhUTUxFbGVtZW50LFxuICogICBjbGFzc05hbWU6IHN0cmluZyxcbiAqICAgY2xhc3NBc1N0cmluZzogc3RyaW5nLFxuICogICBjc3NDbGFzczogc3RyaW5nLFxuICogICB3aWRnZXQ6IHN0cmluZ1xuICogfX1cbiAqL1xuY29tcG9uZW50SGFuZGxlci5Db21wb25lbnQ7ICAvLyBqc2hpbnQgaWdub3JlOmxpbmVcblxuLy8gRXhwb3J0IGFsbCBzeW1ib2xzLCBmb3IgdGhlIGJlbmVmaXQgb2YgQ2xvc3VyZSBjb21waWxlci5cbi8vIE5vIGVmZmVjdCBvbiB1bmNvbXBpbGVkIGNvZGUuXG5jb21wb25lbnRIYW5kbGVyWyd1cGdyYWRlRG9tJ10gPSBjb21wb25lbnRIYW5kbGVyLnVwZ3JhZGVEb207XG5jb21wb25lbnRIYW5kbGVyWyd1cGdyYWRlRWxlbWVudCddID0gY29tcG9uZW50SGFuZGxlci51cGdyYWRlRWxlbWVudDtcbmNvbXBvbmVudEhhbmRsZXJbJ3VwZ3JhZGVFbGVtZW50cyddID0gY29tcG9uZW50SGFuZGxlci51cGdyYWRlRWxlbWVudHM7XG5jb21wb25lbnRIYW5kbGVyWyd1cGdyYWRlQWxsUmVnaXN0ZXJlZCddID1cbiAgICBjb21wb25lbnRIYW5kbGVyLnVwZ3JhZGVBbGxSZWdpc3RlcmVkO1xuY29tcG9uZW50SGFuZGxlclsncmVnaXN0ZXJVcGdyYWRlZENhbGxiYWNrJ10gPVxuICAgIGNvbXBvbmVudEhhbmRsZXIucmVnaXN0ZXJVcGdyYWRlZENhbGxiYWNrO1xuY29tcG9uZW50SGFuZGxlclsncmVnaXN0ZXInXSA9IGNvbXBvbmVudEhhbmRsZXIucmVnaXN0ZXI7XG5jb21wb25lbnRIYW5kbGVyWydkb3duZ3JhZGVFbGVtZW50cyddID0gY29tcG9uZW50SGFuZGxlci5kb3duZ3JhZGVFbGVtZW50cztcbndpbmRvdy5jb21wb25lbnRIYW5kbGVyID0gY29tcG9uZW50SGFuZGxlcjtcbndpbmRvd1snY29tcG9uZW50SGFuZGxlciddID0gY29tcG9uZW50SGFuZGxlcjtcblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8qKlxuICAgKiBQZXJmb3JtcyBhIFwiQ3V0dGluZyB0aGUgbXVzdGFyZFwiIHRlc3QuIElmIHRoZSBicm93c2VyIHN1cHBvcnRzIHRoZSBmZWF0dXJlc1xuICAgKiB0ZXN0ZWQsIGFkZHMgYSBtZGwtanMgY2xhc3MgdG8gdGhlIDxodG1sPiBlbGVtZW50LiBJdCB0aGVuIHVwZ3JhZGVzIGFsbCBNRExcbiAgICogY29tcG9uZW50cyByZXF1aXJpbmcgSmF2YVNjcmlwdC5cbiAgICovXG4gIGlmICgnY2xhc3NMaXN0JyBpbiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSAmJlxuICAgICAgJ3F1ZXJ5U2VsZWN0b3InIGluIGRvY3VtZW50ICYmXG4gICAgICAnYWRkRXZlbnRMaXN0ZW5lcicgaW4gd2luZG93ICYmIEFycmF5LnByb3RvdHlwZS5mb3JFYWNoKSB7XG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsYXNzTGlzdC5hZGQoJ21kbC1qcycpO1xuICAgIGNvbXBvbmVudEhhbmRsZXIudXBncmFkZUFsbFJlZ2lzdGVyZWQoKTtcbiAgfSBlbHNlIHtcbiAgICAvKipcbiAgICAgKiBEdW1teSBmdW5jdGlvbiB0byBhdm9pZCBKUyBlcnJvcnMuXG4gICAgICovXG4gICAgY29tcG9uZW50SGFuZGxlci51cGdyYWRlRWxlbWVudCA9IGZ1bmN0aW9uKCkge307XG4gICAgLyoqXG4gICAgICogRHVtbXkgZnVuY3Rpb24gdG8gYXZvaWQgSlMgZXJyb3JzLlxuICAgICAqL1xuICAgIGNvbXBvbmVudEhhbmRsZXIucmVnaXN0ZXIgPSBmdW5jdGlvbigpIHt9O1xuICB9XG59KTtcblxuLy8gU291cmNlOiBodHRwczovL2dpdGh1Yi5jb20vZGFyaXVzL3JlcXVlc3RBbmltYXRpb25GcmFtZS9ibG9iL21hc3Rlci9yZXF1ZXN0QW5pbWF0aW9uRnJhbWUuanNcbi8vIEFkYXB0ZWQgZnJvbSBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9wYXVsaXJpc2gvMTU3OTY3MSB3aGljaCBkZXJpdmVkIGZyb21cbi8vIGh0dHA6Ly9wYXVsaXJpc2guY29tLzIwMTEvcmVxdWVzdGFuaW1hdGlvbmZyYW1lLWZvci1zbWFydC1hbmltYXRpbmcvXG4vLyBodHRwOi8vbXkub3BlcmEuY29tL2Vtb2xsZXIvYmxvZy8yMDExLzEyLzIwL3JlcXVlc3RhbmltYXRpb25mcmFtZS1mb3Itc21hcnQtZXItYW5pbWF0aW5nXG4vLyByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgcG9seWZpbGwgYnkgRXJpayBNw7ZsbGVyLlxuLy8gRml4ZXMgZnJvbSBQYXVsIElyaXNoLCBUaW5vIFppamRlbCwgQW5kcmV3IE1hbywgS2xlbWVuIFNsYXZpxI0sIERhcml1cyBCYWNvblxuLy8gTUlUIGxpY2Vuc2VcbmlmICghRGF0ZS5ub3cpIHtcbiAgICAvKipcbiAgICogRGF0ZS5ub3cgcG9seWZpbGwuXG4gICAqIEByZXR1cm4ge251bWJlcn0gdGhlIGN1cnJlbnQgRGF0ZVxuICAgKi9cbiAgICBEYXRlLm5vdyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgIH07XG4gICAgRGF0ZVsnbm93J10gPSBEYXRlLm5vdztcbn1cbnZhciB2ZW5kb3JzID0gW1xuICAgICd3ZWJraXQnLFxuICAgICdtb3onXG5dO1xuZm9yICh2YXIgaSA9IDA7IGkgPCB2ZW5kb3JzLmxlbmd0aCAmJiAhd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZTsgKytpKSB7XG4gICAgdmFyIHZwID0gdmVuZG9yc1tpXTtcbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZwICsgJ1JlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA9IHdpbmRvd1t2cCArICdDYW5jZWxBbmltYXRpb25GcmFtZSddIHx8IHdpbmRvd1t2cCArICdDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcbiAgICB3aW5kb3dbJ3JlcXVlc3RBbmltYXRpb25GcmFtZSddID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZTtcbiAgICB3aW5kb3dbJ2NhbmNlbEFuaW1hdGlvbkZyYW1lJ10gPSB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWU7XG59XG5pZiAoL2lQKGFkfGhvbmV8b2QpLipPUyA2Ly50ZXN0KHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50KSB8fCAhd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCAhd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKSB7XG4gICAgdmFyIGxhc3RUaW1lID0gMDtcbiAgICAvKipcbiAgICogcmVxdWVzdEFuaW1hdGlvbkZyYW1lIHBvbHlmaWxsLlxuICAgKiBAcGFyYW0gIHshRnVuY3Rpb259IGNhbGxiYWNrIHRoZSBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICovXG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgICB2YXIgbm93ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgdmFyIG5leHRUaW1lID0gTWF0aC5tYXgobGFzdFRpbWUgKyAxNiwgbm93KTtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY2FsbGJhY2sobGFzdFRpbWUgPSBuZXh0VGltZSk7XG4gICAgICAgIH0sIG5leHRUaW1lIC0gbm93KTtcbiAgICB9O1xuICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA9IGNsZWFyVGltZW91dDtcbiAgICB3aW5kb3dbJ3JlcXVlc3RBbmltYXRpb25GcmFtZSddID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZTtcbiAgICB3aW5kb3dbJ2NhbmNlbEFuaW1hdGlvbkZyYW1lJ10gPSB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWU7XG59XG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNSBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICAgKiBDbGFzcyBjb25zdHJ1Y3RvciBmb3IgQnV0dG9uIE1ETCBjb21wb25lbnQuXG4gICAqIEltcGxlbWVudHMgTURMIGNvbXBvbmVudCBkZXNpZ24gcGF0dGVybiBkZWZpbmVkIGF0OlxuICAgKiBodHRwczovL2dpdGh1Yi5jb20vamFzb25tYXllcy9tZGwtY29tcG9uZW50LWRlc2lnbi1wYXR0ZXJuXG4gICAqXG4gICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsZW1lbnQgVGhlIGVsZW1lbnQgdGhhdCB3aWxsIGJlIHVwZ3JhZGVkLlxuICAgKi9cbnZhciBNYXRlcmlhbEJ1dHRvbiA9IGZ1bmN0aW9uIE1hdGVyaWFsQnV0dG9uKGVsZW1lbnQpIHtcbiAgICB0aGlzLmVsZW1lbnRfID0gZWxlbWVudDtcbiAgICAvLyBJbml0aWFsaXplIGluc3RhbmNlLlxuICAgIHRoaXMuaW5pdCgpO1xufTtcbndpbmRvd1snTWF0ZXJpYWxCdXR0b24nXSA9IE1hdGVyaWFsQnV0dG9uO1xuLyoqXG4gICAqIFN0b3JlIGNvbnN0YW50cyBpbiBvbmUgcGxhY2Ugc28gdGhleSBjYW4gYmUgdXBkYXRlZCBlYXNpbHkuXG4gICAqXG4gICAqIEBlbnVtIHtzdHJpbmcgfCBudW1iZXJ9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxCdXR0b24ucHJvdG90eXBlLkNvbnN0YW50XyA9IHt9O1xuLyoqXG4gICAqIFN0b3JlIHN0cmluZ3MgZm9yIGNsYXNzIG5hbWVzIGRlZmluZWQgYnkgdGhpcyBjb21wb25lbnQgdGhhdCBhcmUgdXNlZCBpblxuICAgKiBKYXZhU2NyaXB0LiBUaGlzIGFsbG93cyB1cyB0byBzaW1wbHkgY2hhbmdlIGl0IGluIG9uZSBwbGFjZSBzaG91bGQgd2VcbiAgICogZGVjaWRlIHRvIG1vZGlmeSBhdCBhIGxhdGVyIGRhdGUuXG4gICAqXG4gICAqIEBlbnVtIHtzdHJpbmd9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxCdXR0b24ucHJvdG90eXBlLkNzc0NsYXNzZXNfID0ge1xuICAgIFJJUFBMRV9FRkZFQ1Q6ICdtZGwtanMtcmlwcGxlLWVmZmVjdCcsXG4gICAgUklQUExFX0NPTlRBSU5FUjogJ21kbC1idXR0b25fX3JpcHBsZS1jb250YWluZXInLFxuICAgIFJJUFBMRTogJ21kbC1yaXBwbGUnXG59O1xuLyoqXG4gICAqIEhhbmRsZSBibHVyIG9mIGVsZW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IFRoZSBldmVudCB0aGF0IGZpcmVkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsQnV0dG9uLnByb3RvdHlwZS5ibHVySGFuZGxlcl8gPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBpZiAoZXZlbnQpIHtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5ibHVyKCk7XG4gICAgfVxufTtcbi8vIFB1YmxpYyBtZXRob2RzLlxuLyoqXG4gICAqIERpc2FibGUgYnV0dG9uLlxuICAgKlxuICAgKiBAcHVibGljXG4gICAqL1xuTWF0ZXJpYWxCdXR0b24ucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5lbGVtZW50Xy5kaXNhYmxlZCA9IHRydWU7XG59O1xuTWF0ZXJpYWxCdXR0b24ucHJvdG90eXBlWydkaXNhYmxlJ10gPSBNYXRlcmlhbEJ1dHRvbi5wcm90b3R5cGUuZGlzYWJsZTtcbi8qKlxuICAgKiBFbmFibGUgYnV0dG9uLlxuICAgKlxuICAgKiBAcHVibGljXG4gICAqL1xuTWF0ZXJpYWxCdXR0b24ucHJvdG90eXBlLmVuYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmVsZW1lbnRfLmRpc2FibGVkID0gZmFsc2U7XG59O1xuTWF0ZXJpYWxCdXR0b24ucHJvdG90eXBlWydlbmFibGUnXSA9IE1hdGVyaWFsQnV0dG9uLnByb3RvdHlwZS5lbmFibGU7XG4vKipcbiAgICogSW5pdGlhbGl6ZSBlbGVtZW50LlxuICAgKi9cbk1hdGVyaWFsQnV0dG9uLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmVsZW1lbnRfKSB7XG4gICAgICAgIGlmICh0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLlJJUFBMRV9FRkZFQ1QpKSB7XG4gICAgICAgICAgICB2YXIgcmlwcGxlQ29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgcmlwcGxlQ29udGFpbmVyLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5SSVBQTEVfQ09OVEFJTkVSKTtcbiAgICAgICAgICAgIHRoaXMucmlwcGxlRWxlbWVudF8gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICB0aGlzLnJpcHBsZUVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5SSVBQTEUpO1xuICAgICAgICAgICAgcmlwcGxlQ29udGFpbmVyLmFwcGVuZENoaWxkKHRoaXMucmlwcGxlRWxlbWVudF8pO1xuICAgICAgICAgICAgdGhpcy5ib3VuZFJpcHBsZUJsdXJIYW5kbGVyID0gdGhpcy5ibHVySGFuZGxlcl8uYmluZCh0aGlzKTtcbiAgICAgICAgICAgIHRoaXMucmlwcGxlRWxlbWVudF8uYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuYm91bmRSaXBwbGVCbHVySGFuZGxlcik7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRfLmFwcGVuZENoaWxkKHJpcHBsZUNvbnRhaW5lcik7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5ib3VuZEJ1dHRvbkJsdXJIYW5kbGVyID0gdGhpcy5ibHVySGFuZGxlcl8uYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5ib3VuZEJ1dHRvbkJsdXJIYW5kbGVyKTtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWxlYXZlJywgdGhpcy5ib3VuZEJ1dHRvbkJsdXJIYW5kbGVyKTtcbiAgICB9XG59O1xuLy8gVGhlIGNvbXBvbmVudCByZWdpc3RlcnMgaXRzZWxmLiBJdCBjYW4gYXNzdW1lIGNvbXBvbmVudEhhbmRsZXIgaXMgYXZhaWxhYmxlXG4vLyBpbiB0aGUgZ2xvYmFsIHNjb3BlLlxuY29tcG9uZW50SGFuZGxlci5yZWdpc3Rlcih7XG4gICAgY29uc3RydWN0b3I6IE1hdGVyaWFsQnV0dG9uLFxuICAgIGNsYXNzQXNTdHJpbmc6ICdNYXRlcmlhbEJ1dHRvbicsXG4gICAgY3NzQ2xhc3M6ICdtZGwtanMtYnV0dG9uJyxcbiAgICB3aWRnZXQ6IHRydWVcbn0pO1xuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTUgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAgICogQ2xhc3MgY29uc3RydWN0b3IgZm9yIENoZWNrYm94IE1ETCBjb21wb25lbnQuXG4gICAqIEltcGxlbWVudHMgTURMIGNvbXBvbmVudCBkZXNpZ24gcGF0dGVybiBkZWZpbmVkIGF0OlxuICAgKiBodHRwczovL2dpdGh1Yi5jb20vamFzb25tYXllcy9tZGwtY29tcG9uZW50LWRlc2lnbi1wYXR0ZXJuXG4gICAqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbGVtZW50IFRoZSBlbGVtZW50IHRoYXQgd2lsbCBiZSB1cGdyYWRlZC5cbiAgICovXG52YXIgTWF0ZXJpYWxDaGVja2JveCA9IGZ1bmN0aW9uIE1hdGVyaWFsQ2hlY2tib3goZWxlbWVudCkge1xuICAgIHRoaXMuZWxlbWVudF8gPSBlbGVtZW50O1xuICAgIC8vIEluaXRpYWxpemUgaW5zdGFuY2UuXG4gICAgdGhpcy5pbml0KCk7XG59O1xud2luZG93WydNYXRlcmlhbENoZWNrYm94J10gPSBNYXRlcmlhbENoZWNrYm94O1xuLyoqXG4gICAqIFN0b3JlIGNvbnN0YW50cyBpbiBvbmUgcGxhY2Ugc28gdGhleSBjYW4gYmUgdXBkYXRlZCBlYXNpbHkuXG4gICAqXG4gICAqIEBlbnVtIHtzdHJpbmcgfCBudW1iZXJ9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxDaGVja2JveC5wcm90b3R5cGUuQ29uc3RhbnRfID0geyBUSU5ZX1RJTUVPVVQ6IDAuMDAxIH07XG4vKipcbiAgICogU3RvcmUgc3RyaW5ncyBmb3IgY2xhc3MgbmFtZXMgZGVmaW5lZCBieSB0aGlzIGNvbXBvbmVudCB0aGF0IGFyZSB1c2VkIGluXG4gICAqIEphdmFTY3JpcHQuIFRoaXMgYWxsb3dzIHVzIHRvIHNpbXBseSBjaGFuZ2UgaXQgaW4gb25lIHBsYWNlIHNob3VsZCB3ZVxuICAgKiBkZWNpZGUgdG8gbW9kaWZ5IGF0IGEgbGF0ZXIgZGF0ZS5cbiAgICpcbiAgICogQGVudW0ge3N0cmluZ31cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbENoZWNrYm94LnByb3RvdHlwZS5Dc3NDbGFzc2VzXyA9IHtcbiAgICBJTlBVVDogJ21kbC1jaGVja2JveF9faW5wdXQnLFxuICAgIEJPWF9PVVRMSU5FOiAnbWRsLWNoZWNrYm94X19ib3gtb3V0bGluZScsXG4gICAgRk9DVVNfSEVMUEVSOiAnbWRsLWNoZWNrYm94X19mb2N1cy1oZWxwZXInLFxuICAgIFRJQ0tfT1VUTElORTogJ21kbC1jaGVja2JveF9fdGljay1vdXRsaW5lJyxcbiAgICBSSVBQTEVfRUZGRUNUOiAnbWRsLWpzLXJpcHBsZS1lZmZlY3QnLFxuICAgIFJJUFBMRV9JR05PUkVfRVZFTlRTOiAnbWRsLWpzLXJpcHBsZS1lZmZlY3QtLWlnbm9yZS1ldmVudHMnLFxuICAgIFJJUFBMRV9DT05UQUlORVI6ICdtZGwtY2hlY2tib3hfX3JpcHBsZS1jb250YWluZXInLFxuICAgIFJJUFBMRV9DRU5URVI6ICdtZGwtcmlwcGxlLS1jZW50ZXInLFxuICAgIFJJUFBMRTogJ21kbC1yaXBwbGUnLFxuICAgIElTX0ZPQ1VTRUQ6ICdpcy1mb2N1c2VkJyxcbiAgICBJU19ESVNBQkxFRDogJ2lzLWRpc2FibGVkJyxcbiAgICBJU19DSEVDS0VEOiAnaXMtY2hlY2tlZCcsXG4gICAgSVNfVVBHUkFERUQ6ICdpcy11cGdyYWRlZCdcbn07XG4vKipcbiAgICogSGFuZGxlIGNoYW5nZSBvZiBzdGF0ZS5cbiAgICpcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnQgVGhlIGV2ZW50IHRoYXQgZmlyZWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxDaGVja2JveC5wcm90b3R5cGUub25DaGFuZ2VfID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdGhpcy51cGRhdGVDbGFzc2VzXygpO1xufTtcbi8qKlxuICAgKiBIYW5kbGUgZm9jdXMgb2YgZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnQgVGhlIGV2ZW50IHRoYXQgZmlyZWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxDaGVja2JveC5wcm90b3R5cGUub25Gb2N1c18gPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JU19GT0NVU0VEKTtcbn07XG4vKipcbiAgICogSGFuZGxlIGxvc3QgZm9jdXMgb2YgZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnQgVGhlIGV2ZW50IHRoYXQgZmlyZWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxDaGVja2JveC5wcm90b3R5cGUub25CbHVyXyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LnJlbW92ZSh0aGlzLkNzc0NsYXNzZXNfLklTX0ZPQ1VTRUQpO1xufTtcbi8qKlxuICAgKiBIYW5kbGUgbW91c2V1cC5cbiAgICpcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnQgVGhlIGV2ZW50IHRoYXQgZmlyZWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxDaGVja2JveC5wcm90b3R5cGUub25Nb3VzZVVwXyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHRoaXMuYmx1cl8oKTtcbn07XG4vKipcbiAgICogSGFuZGxlIGNsYXNzIHVwZGF0ZXMuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxDaGVja2JveC5wcm90b3R5cGUudXBkYXRlQ2xhc3Nlc18gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5jaGVja0Rpc2FibGVkKCk7XG4gICAgdGhpcy5jaGVja1RvZ2dsZVN0YXRlKCk7XG59O1xuLyoqXG4gICAqIEFkZCBibHVyLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsQ2hlY2tib3gucHJvdG90eXBlLmJsdXJfID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIFRPRE86IGZpZ3VyZSBvdXQgd2h5IHRoZXJlJ3MgYSBmb2N1cyBldmVudCBiZWluZyBmaXJlZCBhZnRlciBvdXIgYmx1cixcbiAgICAvLyBzbyB0aGF0IHdlIGNhbiBhdm9pZCB0aGlzIGhhY2suXG4gICAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmlucHV0RWxlbWVudF8uYmx1cigpO1xuICAgIH0uYmluZCh0aGlzKSwgdGhpcy5Db25zdGFudF8uVElOWV9USU1FT1VUKTtcbn07XG4vLyBQdWJsaWMgbWV0aG9kcy5cbi8qKlxuICAgKiBDaGVjayB0aGUgaW5wdXRzIHRvZ2dsZSBzdGF0ZSBhbmQgdXBkYXRlIGRpc3BsYXkuXG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICovXG5NYXRlcmlhbENoZWNrYm94LnByb3RvdHlwZS5jaGVja1RvZ2dsZVN0YXRlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmlucHV0RWxlbWVudF8uY2hlY2tlZCkge1xuICAgICAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JU19DSEVDS0VEKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5yZW1vdmUodGhpcy5Dc3NDbGFzc2VzXy5JU19DSEVDS0VEKTtcbiAgICB9XG59O1xuTWF0ZXJpYWxDaGVja2JveC5wcm90b3R5cGVbJ2NoZWNrVG9nZ2xlU3RhdGUnXSA9IE1hdGVyaWFsQ2hlY2tib3gucHJvdG90eXBlLmNoZWNrVG9nZ2xlU3RhdGU7XG4vKipcbiAgICogQ2hlY2sgdGhlIGlucHV0cyBkaXNhYmxlZCBzdGF0ZSBhbmQgdXBkYXRlIGRpc3BsYXkuXG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICovXG5NYXRlcmlhbENoZWNrYm94LnByb3RvdHlwZS5jaGVja0Rpc2FibGVkID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmlucHV0RWxlbWVudF8uZGlzYWJsZWQpIHtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfRElTQUJMRUQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LnJlbW92ZSh0aGlzLkNzc0NsYXNzZXNfLklTX0RJU0FCTEVEKTtcbiAgICB9XG59O1xuTWF0ZXJpYWxDaGVja2JveC5wcm90b3R5cGVbJ2NoZWNrRGlzYWJsZWQnXSA9IE1hdGVyaWFsQ2hlY2tib3gucHJvdG90eXBlLmNoZWNrRGlzYWJsZWQ7XG4vKipcbiAgICogRGlzYWJsZSBjaGVja2JveC5cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKi9cbk1hdGVyaWFsQ2hlY2tib3gucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5pbnB1dEVsZW1lbnRfLmRpc2FibGVkID0gdHJ1ZTtcbiAgICB0aGlzLnVwZGF0ZUNsYXNzZXNfKCk7XG59O1xuTWF0ZXJpYWxDaGVja2JveC5wcm90b3R5cGVbJ2Rpc2FibGUnXSA9IE1hdGVyaWFsQ2hlY2tib3gucHJvdG90eXBlLmRpc2FibGU7XG4vKipcbiAgICogRW5hYmxlIGNoZWNrYm94LlxuICAgKlxuICAgKiBAcHVibGljXG4gICAqL1xuTWF0ZXJpYWxDaGVja2JveC5wcm90b3R5cGUuZW5hYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuaW5wdXRFbGVtZW50Xy5kaXNhYmxlZCA9IGZhbHNlO1xuICAgIHRoaXMudXBkYXRlQ2xhc3Nlc18oKTtcbn07XG5NYXRlcmlhbENoZWNrYm94LnByb3RvdHlwZVsnZW5hYmxlJ10gPSBNYXRlcmlhbENoZWNrYm94LnByb3RvdHlwZS5lbmFibGU7XG4vKipcbiAgICogQ2hlY2sgY2hlY2tib3guXG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICovXG5NYXRlcmlhbENoZWNrYm94LnByb3RvdHlwZS5jaGVjayA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmlucHV0RWxlbWVudF8uY2hlY2tlZCA9IHRydWU7XG4gICAgdGhpcy51cGRhdGVDbGFzc2VzXygpO1xufTtcbk1hdGVyaWFsQ2hlY2tib3gucHJvdG90eXBlWydjaGVjayddID0gTWF0ZXJpYWxDaGVja2JveC5wcm90b3R5cGUuY2hlY2s7XG4vKipcbiAgICogVW5jaGVjayBjaGVja2JveC5cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKi9cbk1hdGVyaWFsQ2hlY2tib3gucHJvdG90eXBlLnVuY2hlY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5pbnB1dEVsZW1lbnRfLmNoZWNrZWQgPSBmYWxzZTtcbiAgICB0aGlzLnVwZGF0ZUNsYXNzZXNfKCk7XG59O1xuTWF0ZXJpYWxDaGVja2JveC5wcm90b3R5cGVbJ3VuY2hlY2snXSA9IE1hdGVyaWFsQ2hlY2tib3gucHJvdG90eXBlLnVuY2hlY2s7XG4vKipcbiAgICogSW5pdGlhbGl6ZSBlbGVtZW50LlxuICAgKi9cbk1hdGVyaWFsQ2hlY2tib3gucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuZWxlbWVudF8pIHtcbiAgICAgICAgdGhpcy5pbnB1dEVsZW1lbnRfID0gdGhpcy5lbGVtZW50Xy5xdWVyeVNlbGVjdG9yKCcuJyArIHRoaXMuQ3NzQ2xhc3Nlc18uSU5QVVQpO1xuICAgICAgICB2YXIgYm94T3V0bGluZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgYm94T3V0bGluZS5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uQk9YX09VVExJTkUpO1xuICAgICAgICB2YXIgdGlja0NvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgdGlja0NvbnRhaW5lci5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uRk9DVVNfSEVMUEVSKTtcbiAgICAgICAgdmFyIHRpY2tPdXRsaW5lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICB0aWNrT3V0bGluZS5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uVElDS19PVVRMSU5FKTtcbiAgICAgICAgYm94T3V0bGluZS5hcHBlbmRDaGlsZCh0aWNrT3V0bGluZSk7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uYXBwZW5kQ2hpbGQodGlja0NvbnRhaW5lcik7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uYXBwZW5kQ2hpbGQoYm94T3V0bGluZSk7XG4gICAgICAgIGlmICh0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLlJJUFBMRV9FRkZFQ1QpKSB7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5SSVBQTEVfSUdOT1JFX0VWRU5UUyk7XG4gICAgICAgICAgICB0aGlzLnJpcHBsZUNvbnRhaW5lckVsZW1lbnRfID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgdGhpcy5yaXBwbGVDb250YWluZXJFbGVtZW50Xy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uUklQUExFX0NPTlRBSU5FUik7XG4gICAgICAgICAgICB0aGlzLnJpcHBsZUNvbnRhaW5lckVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5SSVBQTEVfRUZGRUNUKTtcbiAgICAgICAgICAgIHRoaXMucmlwcGxlQ29udGFpbmVyRWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLlJJUFBMRV9DRU5URVIpO1xuICAgICAgICAgICAgdGhpcy5ib3VuZFJpcHBsZU1vdXNlVXAgPSB0aGlzLm9uTW91c2VVcF8uYmluZCh0aGlzKTtcbiAgICAgICAgICAgIHRoaXMucmlwcGxlQ29udGFpbmVyRWxlbWVudF8uYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuYm91bmRSaXBwbGVNb3VzZVVwKTtcbiAgICAgICAgICAgIHZhciByaXBwbGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICByaXBwbGUuY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLlJJUFBMRSk7XG4gICAgICAgICAgICB0aGlzLnJpcHBsZUNvbnRhaW5lckVsZW1lbnRfLmFwcGVuZENoaWxkKHJpcHBsZSk7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRfLmFwcGVuZENoaWxkKHRoaXMucmlwcGxlQ29udGFpbmVyRWxlbWVudF8pO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYm91bmRJbnB1dE9uQ2hhbmdlID0gdGhpcy5vbkNoYW5nZV8uYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5ib3VuZElucHV0T25Gb2N1cyA9IHRoaXMub25Gb2N1c18uYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5ib3VuZElucHV0T25CbHVyID0gdGhpcy5vbkJsdXJfLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuYm91bmRFbGVtZW50TW91c2VVcCA9IHRoaXMub25Nb3VzZVVwXy5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmlucHV0RWxlbWVudF8uYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgdGhpcy5ib3VuZElucHV0T25DaGFuZ2UpO1xuICAgICAgICB0aGlzLmlucHV0RWxlbWVudF8uYWRkRXZlbnRMaXN0ZW5lcignZm9jdXMnLCB0aGlzLmJvdW5kSW5wdXRPbkZvY3VzKTtcbiAgICAgICAgdGhpcy5pbnB1dEVsZW1lbnRfLmFkZEV2ZW50TGlzdGVuZXIoJ2JsdXInLCB0aGlzLmJvdW5kSW5wdXRPbkJsdXIpO1xuICAgICAgICB0aGlzLmVsZW1lbnRfLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCB0aGlzLmJvdW5kRWxlbWVudE1vdXNlVXApO1xuICAgICAgICB0aGlzLnVwZGF0ZUNsYXNzZXNfKCk7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLklTX1VQR1JBREVEKTtcbiAgICB9XG59O1xuLy8gVGhlIGNvbXBvbmVudCByZWdpc3RlcnMgaXRzZWxmLiBJdCBjYW4gYXNzdW1lIGNvbXBvbmVudEhhbmRsZXIgaXMgYXZhaWxhYmxlXG4vLyBpbiB0aGUgZ2xvYmFsIHNjb3BlLlxuY29tcG9uZW50SGFuZGxlci5yZWdpc3Rlcih7XG4gICAgY29uc3RydWN0b3I6IE1hdGVyaWFsQ2hlY2tib3gsXG4gICAgY2xhc3NBc1N0cmluZzogJ01hdGVyaWFsQ2hlY2tib3gnLFxuICAgIGNzc0NsYXNzOiAnbWRsLWpzLWNoZWNrYm94JyxcbiAgICB3aWRnZXQ6IHRydWVcbn0pO1xuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTUgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAgICogQ2xhc3MgY29uc3RydWN0b3IgZm9yIGljb24gdG9nZ2xlIE1ETCBjb21wb25lbnQuXG4gICAqIEltcGxlbWVudHMgTURMIGNvbXBvbmVudCBkZXNpZ24gcGF0dGVybiBkZWZpbmVkIGF0OlxuICAgKiBodHRwczovL2dpdGh1Yi5jb20vamFzb25tYXllcy9tZGwtY29tcG9uZW50LWRlc2lnbi1wYXR0ZXJuXG4gICAqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbGVtZW50IFRoZSBlbGVtZW50IHRoYXQgd2lsbCBiZSB1cGdyYWRlZC5cbiAgICovXG52YXIgTWF0ZXJpYWxJY29uVG9nZ2xlID0gZnVuY3Rpb24gTWF0ZXJpYWxJY29uVG9nZ2xlKGVsZW1lbnQpIHtcbiAgICB0aGlzLmVsZW1lbnRfID0gZWxlbWVudDtcbiAgICAvLyBJbml0aWFsaXplIGluc3RhbmNlLlxuICAgIHRoaXMuaW5pdCgpO1xufTtcbndpbmRvd1snTWF0ZXJpYWxJY29uVG9nZ2xlJ10gPSBNYXRlcmlhbEljb25Ub2dnbGU7XG4vKipcbiAgICogU3RvcmUgY29uc3RhbnRzIGluIG9uZSBwbGFjZSBzbyB0aGV5IGNhbiBiZSB1cGRhdGVkIGVhc2lseS5cbiAgICpcbiAgICogQGVudW0ge3N0cmluZyB8IG51bWJlcn1cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbEljb25Ub2dnbGUucHJvdG90eXBlLkNvbnN0YW50XyA9IHsgVElOWV9USU1FT1VUOiAwLjAwMSB9O1xuLyoqXG4gICAqIFN0b3JlIHN0cmluZ3MgZm9yIGNsYXNzIG5hbWVzIGRlZmluZWQgYnkgdGhpcyBjb21wb25lbnQgdGhhdCBhcmUgdXNlZCBpblxuICAgKiBKYXZhU2NyaXB0LiBUaGlzIGFsbG93cyB1cyB0byBzaW1wbHkgY2hhbmdlIGl0IGluIG9uZSBwbGFjZSBzaG91bGQgd2VcbiAgICogZGVjaWRlIHRvIG1vZGlmeSBhdCBhIGxhdGVyIGRhdGUuXG4gICAqXG4gICAqIEBlbnVtIHtzdHJpbmd9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxJY29uVG9nZ2xlLnByb3RvdHlwZS5Dc3NDbGFzc2VzXyA9IHtcbiAgICBJTlBVVDogJ21kbC1pY29uLXRvZ2dsZV9faW5wdXQnLFxuICAgIEpTX1JJUFBMRV9FRkZFQ1Q6ICdtZGwtanMtcmlwcGxlLWVmZmVjdCcsXG4gICAgUklQUExFX0lHTk9SRV9FVkVOVFM6ICdtZGwtanMtcmlwcGxlLWVmZmVjdC0taWdub3JlLWV2ZW50cycsXG4gICAgUklQUExFX0NPTlRBSU5FUjogJ21kbC1pY29uLXRvZ2dsZV9fcmlwcGxlLWNvbnRhaW5lcicsXG4gICAgUklQUExFX0NFTlRFUjogJ21kbC1yaXBwbGUtLWNlbnRlcicsXG4gICAgUklQUExFOiAnbWRsLXJpcHBsZScsXG4gICAgSVNfRk9DVVNFRDogJ2lzLWZvY3VzZWQnLFxuICAgIElTX0RJU0FCTEVEOiAnaXMtZGlzYWJsZWQnLFxuICAgIElTX0NIRUNLRUQ6ICdpcy1jaGVja2VkJ1xufTtcbi8qKlxuICAgKiBIYW5kbGUgY2hhbmdlIG9mIHN0YXRlLlxuICAgKlxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudCBUaGUgZXZlbnQgdGhhdCBmaXJlZC5cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbEljb25Ub2dnbGUucHJvdG90eXBlLm9uQ2hhbmdlXyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHRoaXMudXBkYXRlQ2xhc3Nlc18oKTtcbn07XG4vKipcbiAgICogSGFuZGxlIGZvY3VzIG9mIGVsZW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IFRoZSBldmVudCB0aGF0IGZpcmVkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsSWNvblRvZ2dsZS5wcm90b3R5cGUub25Gb2N1c18gPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JU19GT0NVU0VEKTtcbn07XG4vKipcbiAgICogSGFuZGxlIGxvc3QgZm9jdXMgb2YgZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnQgVGhlIGV2ZW50IHRoYXQgZmlyZWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxJY29uVG9nZ2xlLnByb3RvdHlwZS5vbkJsdXJfID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfRk9DVVNFRCk7XG59O1xuLyoqXG4gICAqIEhhbmRsZSBtb3VzZXVwLlxuICAgKlxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudCBUaGUgZXZlbnQgdGhhdCBmaXJlZC5cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbEljb25Ub2dnbGUucHJvdG90eXBlLm9uTW91c2VVcF8gPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB0aGlzLmJsdXJfKCk7XG59O1xuLyoqXG4gICAqIEhhbmRsZSBjbGFzcyB1cGRhdGVzLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsSWNvblRvZ2dsZS5wcm90b3R5cGUudXBkYXRlQ2xhc3Nlc18gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5jaGVja0Rpc2FibGVkKCk7XG4gICAgdGhpcy5jaGVja1RvZ2dsZVN0YXRlKCk7XG59O1xuLyoqXG4gICAqIEFkZCBibHVyLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsSWNvblRvZ2dsZS5wcm90b3R5cGUuYmx1cl8gPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gVE9ETzogZmlndXJlIG91dCB3aHkgdGhlcmUncyBhIGZvY3VzIGV2ZW50IGJlaW5nIGZpcmVkIGFmdGVyIG91ciBibHVyLFxuICAgIC8vIHNvIHRoYXQgd2UgY2FuIGF2b2lkIHRoaXMgaGFjay5cbiAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuaW5wdXRFbGVtZW50Xy5ibHVyKCk7XG4gICAgfS5iaW5kKHRoaXMpLCB0aGlzLkNvbnN0YW50Xy5USU5ZX1RJTUVPVVQpO1xufTtcbi8vIFB1YmxpYyBtZXRob2RzLlxuLyoqXG4gICAqIENoZWNrIHRoZSBpbnB1dHMgdG9nZ2xlIHN0YXRlIGFuZCB1cGRhdGUgZGlzcGxheS5cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKi9cbk1hdGVyaWFsSWNvblRvZ2dsZS5wcm90b3R5cGUuY2hlY2tUb2dnbGVTdGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5pbnB1dEVsZW1lbnRfLmNoZWNrZWQpIHtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfQ0hFQ0tFRCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfQ0hFQ0tFRCk7XG4gICAgfVxufTtcbk1hdGVyaWFsSWNvblRvZ2dsZS5wcm90b3R5cGVbJ2NoZWNrVG9nZ2xlU3RhdGUnXSA9IE1hdGVyaWFsSWNvblRvZ2dsZS5wcm90b3R5cGUuY2hlY2tUb2dnbGVTdGF0ZTtcbi8qKlxuICAgKiBDaGVjayB0aGUgaW5wdXRzIGRpc2FibGVkIHN0YXRlIGFuZCB1cGRhdGUgZGlzcGxheS5cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKi9cbk1hdGVyaWFsSWNvblRvZ2dsZS5wcm90b3R5cGUuY2hlY2tEaXNhYmxlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5pbnB1dEVsZW1lbnRfLmRpc2FibGVkKSB7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLklTX0RJU0FCTEVEKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5yZW1vdmUodGhpcy5Dc3NDbGFzc2VzXy5JU19ESVNBQkxFRCk7XG4gICAgfVxufTtcbk1hdGVyaWFsSWNvblRvZ2dsZS5wcm90b3R5cGVbJ2NoZWNrRGlzYWJsZWQnXSA9IE1hdGVyaWFsSWNvblRvZ2dsZS5wcm90b3R5cGUuY2hlY2tEaXNhYmxlZDtcbi8qKlxuICAgKiBEaXNhYmxlIGljb24gdG9nZ2xlLlxuICAgKlxuICAgKiBAcHVibGljXG4gICAqL1xuTWF0ZXJpYWxJY29uVG9nZ2xlLnByb3RvdHlwZS5kaXNhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuaW5wdXRFbGVtZW50Xy5kaXNhYmxlZCA9IHRydWU7XG4gICAgdGhpcy51cGRhdGVDbGFzc2VzXygpO1xufTtcbk1hdGVyaWFsSWNvblRvZ2dsZS5wcm90b3R5cGVbJ2Rpc2FibGUnXSA9IE1hdGVyaWFsSWNvblRvZ2dsZS5wcm90b3R5cGUuZGlzYWJsZTtcbi8qKlxuICAgKiBFbmFibGUgaWNvbiB0b2dnbGUuXG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICovXG5NYXRlcmlhbEljb25Ub2dnbGUucHJvdG90eXBlLmVuYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmlucHV0RWxlbWVudF8uZGlzYWJsZWQgPSBmYWxzZTtcbiAgICB0aGlzLnVwZGF0ZUNsYXNzZXNfKCk7XG59O1xuTWF0ZXJpYWxJY29uVG9nZ2xlLnByb3RvdHlwZVsnZW5hYmxlJ10gPSBNYXRlcmlhbEljb25Ub2dnbGUucHJvdG90eXBlLmVuYWJsZTtcbi8qKlxuICAgKiBDaGVjayBpY29uIHRvZ2dsZS5cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKi9cbk1hdGVyaWFsSWNvblRvZ2dsZS5wcm90b3R5cGUuY2hlY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5pbnB1dEVsZW1lbnRfLmNoZWNrZWQgPSB0cnVlO1xuICAgIHRoaXMudXBkYXRlQ2xhc3Nlc18oKTtcbn07XG5NYXRlcmlhbEljb25Ub2dnbGUucHJvdG90eXBlWydjaGVjayddID0gTWF0ZXJpYWxJY29uVG9nZ2xlLnByb3RvdHlwZS5jaGVjaztcbi8qKlxuICAgKiBVbmNoZWNrIGljb24gdG9nZ2xlLlxuICAgKlxuICAgKiBAcHVibGljXG4gICAqL1xuTWF0ZXJpYWxJY29uVG9nZ2xlLnByb3RvdHlwZS51bmNoZWNrID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuaW5wdXRFbGVtZW50Xy5jaGVja2VkID0gZmFsc2U7XG4gICAgdGhpcy51cGRhdGVDbGFzc2VzXygpO1xufTtcbk1hdGVyaWFsSWNvblRvZ2dsZS5wcm90b3R5cGVbJ3VuY2hlY2snXSA9IE1hdGVyaWFsSWNvblRvZ2dsZS5wcm90b3R5cGUudW5jaGVjaztcbi8qKlxuICAgKiBJbml0aWFsaXplIGVsZW1lbnQuXG4gICAqL1xuTWF0ZXJpYWxJY29uVG9nZ2xlLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmVsZW1lbnRfKSB7XG4gICAgICAgIHRoaXMuaW5wdXRFbGVtZW50XyA9IHRoaXMuZWxlbWVudF8ucXVlcnlTZWxlY3RvcignLicgKyB0aGlzLkNzc0NsYXNzZXNfLklOUFVUKTtcbiAgICAgICAgaWYgKHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uSlNfUklQUExFX0VGRkVDVCkpIHtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLlJJUFBMRV9JR05PUkVfRVZFTlRTKTtcbiAgICAgICAgICAgIHRoaXMucmlwcGxlQ29udGFpbmVyRWxlbWVudF8gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICB0aGlzLnJpcHBsZUNvbnRhaW5lckVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5SSVBQTEVfQ09OVEFJTkVSKTtcbiAgICAgICAgICAgIHRoaXMucmlwcGxlQ29udGFpbmVyRWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLkpTX1JJUFBMRV9FRkZFQ1QpO1xuICAgICAgICAgICAgdGhpcy5yaXBwbGVDb250YWluZXJFbGVtZW50Xy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uUklQUExFX0NFTlRFUik7XG4gICAgICAgICAgICB0aGlzLmJvdW5kUmlwcGxlTW91c2VVcCA9IHRoaXMub25Nb3VzZVVwXy5iaW5kKHRoaXMpO1xuICAgICAgICAgICAgdGhpcy5yaXBwbGVDb250YWluZXJFbGVtZW50Xy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5ib3VuZFJpcHBsZU1vdXNlVXApO1xuICAgICAgICAgICAgdmFyIHJpcHBsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgIHJpcHBsZS5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uUklQUExFKTtcbiAgICAgICAgICAgIHRoaXMucmlwcGxlQ29udGFpbmVyRWxlbWVudF8uYXBwZW5kQ2hpbGQocmlwcGxlKTtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudF8uYXBwZW5kQ2hpbGQodGhpcy5yaXBwbGVDb250YWluZXJFbGVtZW50Xyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5ib3VuZElucHV0T25DaGFuZ2UgPSB0aGlzLm9uQ2hhbmdlXy5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmJvdW5kSW5wdXRPbkZvY3VzID0gdGhpcy5vbkZvY3VzXy5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmJvdW5kSW5wdXRPbkJsdXIgPSB0aGlzLm9uQmx1cl8uYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5ib3VuZEVsZW1lbnRPbk1vdXNlVXAgPSB0aGlzLm9uTW91c2VVcF8uYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5pbnB1dEVsZW1lbnRfLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIHRoaXMuYm91bmRJbnB1dE9uQ2hhbmdlKTtcbiAgICAgICAgdGhpcy5pbnB1dEVsZW1lbnRfLmFkZEV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgdGhpcy5ib3VuZElucHV0T25Gb2N1cyk7XG4gICAgICAgIHRoaXMuaW5wdXRFbGVtZW50Xy5hZGRFdmVudExpc3RlbmVyKCdibHVyJywgdGhpcy5ib3VuZElucHV0T25CbHVyKTtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5ib3VuZEVsZW1lbnRPbk1vdXNlVXApO1xuICAgICAgICB0aGlzLnVwZGF0ZUNsYXNzZXNfKCk7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmFkZCgnaXMtdXBncmFkZWQnKTtcbiAgICB9XG59O1xuLy8gVGhlIGNvbXBvbmVudCByZWdpc3RlcnMgaXRzZWxmLiBJdCBjYW4gYXNzdW1lIGNvbXBvbmVudEhhbmRsZXIgaXMgYXZhaWxhYmxlXG4vLyBpbiB0aGUgZ2xvYmFsIHNjb3BlLlxuY29tcG9uZW50SGFuZGxlci5yZWdpc3Rlcih7XG4gICAgY29uc3RydWN0b3I6IE1hdGVyaWFsSWNvblRvZ2dsZSxcbiAgICBjbGFzc0FzU3RyaW5nOiAnTWF0ZXJpYWxJY29uVG9nZ2xlJyxcbiAgICBjc3NDbGFzczogJ21kbC1qcy1pY29uLXRvZ2dsZScsXG4gICAgd2lkZ2V0OiB0cnVlXG59KTtcbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE1IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gICAqIENsYXNzIGNvbnN0cnVjdG9yIGZvciBkcm9wZG93biBNREwgY29tcG9uZW50LlxuICAgKiBJbXBsZW1lbnRzIE1ETCBjb21wb25lbnQgZGVzaWduIHBhdHRlcm4gZGVmaW5lZCBhdDpcbiAgICogaHR0cHM6Ly9naXRodWIuY29tL2phc29ubWF5ZXMvbWRsLWNvbXBvbmVudC1kZXNpZ24tcGF0dGVyblxuICAgKlxuICAgKiBAY29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxlbWVudCBUaGUgZWxlbWVudCB0aGF0IHdpbGwgYmUgdXBncmFkZWQuXG4gICAqL1xudmFyIE1hdGVyaWFsTWVudSA9IGZ1bmN0aW9uIE1hdGVyaWFsTWVudShlbGVtZW50KSB7XG4gICAgdGhpcy5lbGVtZW50XyA9IGVsZW1lbnQ7XG4gICAgLy8gSW5pdGlhbGl6ZSBpbnN0YW5jZS5cbiAgICB0aGlzLmluaXQoKTtcbn07XG53aW5kb3dbJ01hdGVyaWFsTWVudSddID0gTWF0ZXJpYWxNZW51O1xuLyoqXG4gICAqIFN0b3JlIGNvbnN0YW50cyBpbiBvbmUgcGxhY2Ugc28gdGhleSBjYW4gYmUgdXBkYXRlZCBlYXNpbHkuXG4gICAqXG4gICAqIEBlbnVtIHtzdHJpbmcgfCBudW1iZXJ9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxNZW51LnByb3RvdHlwZS5Db25zdGFudF8gPSB7XG4gICAgLy8gVG90YWwgZHVyYXRpb24gb2YgdGhlIG1lbnUgYW5pbWF0aW9uLlxuICAgIFRSQU5TSVRJT05fRFVSQVRJT05fU0VDT05EUzogMC4zLFxuICAgIC8vIFRoZSBmcmFjdGlvbiBvZiB0aGUgdG90YWwgZHVyYXRpb24gd2Ugd2FudCB0byB1c2UgZm9yIG1lbnUgaXRlbSBhbmltYXRpb25zLlxuICAgIFRSQU5TSVRJT05fRFVSQVRJT05fRlJBQ1RJT046IDAuOCxcbiAgICAvLyBIb3cgbG9uZyB0aGUgbWVudSBzdGF5cyBvcGVuIGFmdGVyIGNob29zaW5nIGFuIG9wdGlvbiAoc28gdGhlIHVzZXIgY2FuIHNlZVxuICAgIC8vIHRoZSByaXBwbGUpLlxuICAgIENMT1NFX1RJTUVPVVQ6IDE1MFxufTtcbi8qKlxuICAgKiBLZXljb2RlcywgZm9yIGNvZGUgcmVhZGFiaWxpdHkuXG4gICAqXG4gICAqIEBlbnVtIHtudW1iZXJ9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxNZW51LnByb3RvdHlwZS5LZXljb2Rlc18gPSB7XG4gICAgRU5URVI6IDEzLFxuICAgIEVTQ0FQRTogMjcsXG4gICAgU1BBQ0U6IDMyLFxuICAgIFVQX0FSUk9XOiAzOCxcbiAgICBET1dOX0FSUk9XOiA0MFxufTtcbi8qKlxuICAgKiBTdG9yZSBzdHJpbmdzIGZvciBjbGFzcyBuYW1lcyBkZWZpbmVkIGJ5IHRoaXMgY29tcG9uZW50IHRoYXQgYXJlIHVzZWQgaW5cbiAgICogSmF2YVNjcmlwdC4gVGhpcyBhbGxvd3MgdXMgdG8gc2ltcGx5IGNoYW5nZSBpdCBpbiBvbmUgcGxhY2Ugc2hvdWxkIHdlXG4gICAqIGRlY2lkZSB0byBtb2RpZnkgYXQgYSBsYXRlciBkYXRlLlxuICAgKlxuICAgKiBAZW51bSB7c3RyaW5nfVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsTWVudS5wcm90b3R5cGUuQ3NzQ2xhc3Nlc18gPSB7XG4gICAgQ09OVEFJTkVSOiAnbWRsLW1lbnVfX2NvbnRhaW5lcicsXG4gICAgT1VUTElORTogJ21kbC1tZW51X19vdXRsaW5lJyxcbiAgICBJVEVNOiAnbWRsLW1lbnVfX2l0ZW0nLFxuICAgIElURU1fUklQUExFX0NPTlRBSU5FUjogJ21kbC1tZW51X19pdGVtLXJpcHBsZS1jb250YWluZXInLFxuICAgIFJJUFBMRV9FRkZFQ1Q6ICdtZGwtanMtcmlwcGxlLWVmZmVjdCcsXG4gICAgUklQUExFX0lHTk9SRV9FVkVOVFM6ICdtZGwtanMtcmlwcGxlLWVmZmVjdC0taWdub3JlLWV2ZW50cycsXG4gICAgUklQUExFOiAnbWRsLXJpcHBsZScsXG4gICAgLy8gU3RhdHVzZXNcbiAgICBJU19VUEdSQURFRDogJ2lzLXVwZ3JhZGVkJyxcbiAgICBJU19WSVNJQkxFOiAnaXMtdmlzaWJsZScsXG4gICAgSVNfQU5JTUFUSU5HOiAnaXMtYW5pbWF0aW5nJyxcbiAgICAvLyBBbGlnbm1lbnQgb3B0aW9uc1xuICAgIEJPVFRPTV9MRUZUOiAnbWRsLW1lbnUtLWJvdHRvbS1sZWZ0JyxcbiAgICAvLyBUaGlzIGlzIHRoZSBkZWZhdWx0LlxuICAgIEJPVFRPTV9SSUdIVDogJ21kbC1tZW51LS1ib3R0b20tcmlnaHQnLFxuICAgIFRPUF9MRUZUOiAnbWRsLW1lbnUtLXRvcC1sZWZ0JyxcbiAgICBUT1BfUklHSFQ6ICdtZGwtbWVudS0tdG9wLXJpZ2h0JyxcbiAgICBVTkFMSUdORUQ6ICdtZGwtbWVudS0tdW5hbGlnbmVkJ1xufTtcbi8qKlxuICAgKiBJbml0aWFsaXplIGVsZW1lbnQuXG4gICAqL1xuTWF0ZXJpYWxNZW51LnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmVsZW1lbnRfKSB7XG4gICAgICAgIC8vIENyZWF0ZSBjb250YWluZXIgZm9yIHRoZSBtZW51LlxuICAgICAgICB2YXIgY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIGNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uQ09OVEFJTkVSKTtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5wYXJlbnRFbGVtZW50Lmluc2VydEJlZm9yZShjb250YWluZXIsIHRoaXMuZWxlbWVudF8pO1xuICAgICAgICB0aGlzLmVsZW1lbnRfLnBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQodGhpcy5lbGVtZW50Xyk7XG4gICAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZCh0aGlzLmVsZW1lbnRfKTtcbiAgICAgICAgdGhpcy5jb250YWluZXJfID0gY29udGFpbmVyO1xuICAgICAgICAvLyBDcmVhdGUgb3V0bGluZSBmb3IgdGhlIG1lbnUgKHNoYWRvdyBhbmQgYmFja2dyb3VuZCkuXG4gICAgICAgIHZhciBvdXRsaW5lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIG91dGxpbmUuY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLk9VVExJTkUpO1xuICAgICAgICB0aGlzLm91dGxpbmVfID0gb3V0bGluZTtcbiAgICAgICAgY29udGFpbmVyLmluc2VydEJlZm9yZShvdXRsaW5lLCB0aGlzLmVsZW1lbnRfKTtcbiAgICAgICAgLy8gRmluZCB0aGUgXCJmb3JcIiBlbGVtZW50IGFuZCBiaW5kIGV2ZW50cyB0byBpdC5cbiAgICAgICAgdmFyIGZvckVsSWQgPSB0aGlzLmVsZW1lbnRfLmdldEF0dHJpYnV0ZSgnZm9yJykgfHwgdGhpcy5lbGVtZW50Xy5nZXRBdHRyaWJ1dGUoJ2RhdGEtbWRsLWZvcicpO1xuICAgICAgICB2YXIgZm9yRWwgPSBudWxsO1xuICAgICAgICBpZiAoZm9yRWxJZCkge1xuICAgICAgICAgICAgZm9yRWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChmb3JFbElkKTtcbiAgICAgICAgICAgIGlmIChmb3JFbCkge1xuICAgICAgICAgICAgICAgIHRoaXMuZm9yRWxlbWVudF8gPSBmb3JFbDtcbiAgICAgICAgICAgICAgICBmb3JFbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuaGFuZGxlRm9yQ2xpY2tfLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgICAgIGZvckVsLmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCB0aGlzLmhhbmRsZUZvcktleWJvYXJkRXZlbnRfLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciBpdGVtcyA9IHRoaXMuZWxlbWVudF8ucXVlcnlTZWxlY3RvckFsbCgnLicgKyB0aGlzLkNzc0NsYXNzZXNfLklURU0pO1xuICAgICAgICB0aGlzLmJvdW5kSXRlbUtleWRvd25fID0gdGhpcy5oYW5kbGVJdGVtS2V5Ym9hcmRFdmVudF8uYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5ib3VuZEl0ZW1DbGlja18gPSB0aGlzLmhhbmRsZUl0ZW1DbGlja18uYmluZCh0aGlzKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgLy8gQWRkIGEgbGlzdGVuZXIgdG8gZWFjaCBtZW51IGl0ZW0uXG4gICAgICAgICAgICBpdGVtc1tpXS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuYm91bmRJdGVtQ2xpY2tfKTtcbiAgICAgICAgICAgIC8vIEFkZCBhIHRhYiBpbmRleCB0byBlYWNoIG1lbnUgaXRlbS5cbiAgICAgICAgICAgIGl0ZW1zW2ldLnRhYkluZGV4ID0gJy0xJztcbiAgICAgICAgICAgIC8vIEFkZCBhIGtleWJvYXJkIGxpc3RlbmVyIHRvIGVhY2ggbWVudSBpdGVtLlxuICAgICAgICAgICAgaXRlbXNbaV0uYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIHRoaXMuYm91bmRJdGVtS2V5ZG93bl8pO1xuICAgICAgICB9XG4gICAgICAgIC8vIEFkZCByaXBwbGUgY2xhc3NlcyB0byBlYWNoIGl0ZW0sIGlmIHRoZSB1c2VyIGhhcyBlbmFibGVkIHJpcHBsZXMuXG4gICAgICAgIGlmICh0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLlJJUFBMRV9FRkZFQ1QpKSB7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5SSVBQTEVfSUdOT1JFX0VWRU5UUyk7XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgaXRlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgaXRlbSA9IGl0ZW1zW2ldO1xuICAgICAgICAgICAgICAgIHZhciByaXBwbGVDb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICAgICAgcmlwcGxlQ29udGFpbmVyLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JVEVNX1JJUFBMRV9DT05UQUlORVIpO1xuICAgICAgICAgICAgICAgIHZhciByaXBwbGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICAgICAgcmlwcGxlLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5SSVBQTEUpO1xuICAgICAgICAgICAgICAgIHJpcHBsZUNvbnRhaW5lci5hcHBlbmRDaGlsZChyaXBwbGUpO1xuICAgICAgICAgICAgICAgIGl0ZW0uYXBwZW5kQ2hpbGQocmlwcGxlQ29udGFpbmVyKTtcbiAgICAgICAgICAgICAgICBpdGVtLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5SSVBQTEVfRUZGRUNUKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBDb3B5IGFsaWdubWVudCBjbGFzc2VzIHRvIHRoZSBjb250YWluZXIsIHNvIHRoZSBvdXRsaW5lIGNhbiB1c2UgdGhlbS5cbiAgICAgICAgaWYgKHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uQk9UVE9NX0xFRlQpKSB7XG4gICAgICAgICAgICB0aGlzLm91dGxpbmVfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5CT1RUT01fTEVGVCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uQk9UVE9NX1JJR0hUKSkge1xuICAgICAgICAgICAgdGhpcy5vdXRsaW5lXy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uQk9UVE9NX1JJR0hUKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5UT1BfTEVGVCkpIHtcbiAgICAgICAgICAgIHRoaXMub3V0bGluZV8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLlRPUF9MRUZUKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5UT1BfUklHSFQpKSB7XG4gICAgICAgICAgICB0aGlzLm91dGxpbmVfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5UT1BfUklHSFQpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLlVOQUxJR05FRCkpIHtcbiAgICAgICAgICAgIHRoaXMub3V0bGluZV8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLlVOQUxJR05FRCk7XG4gICAgICAgIH1cbiAgICAgICAgY29udGFpbmVyLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JU19VUEdSQURFRCk7XG4gICAgfVxufTtcbi8qKlxuICAgKiBIYW5kbGVzIGEgY2xpY2sgb24gdGhlIFwiZm9yXCIgZWxlbWVudCwgYnkgcG9zaXRpb25pbmcgdGhlIG1lbnUgYW5kIHRoZW5cbiAgICogdG9nZ2xpbmcgaXQuXG4gICAqXG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2dCBUaGUgZXZlbnQgdGhhdCBmaXJlZC5cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbE1lbnUucHJvdG90eXBlLmhhbmRsZUZvckNsaWNrXyA9IGZ1bmN0aW9uIChldnQpIHtcbiAgICBpZiAodGhpcy5lbGVtZW50XyAmJiB0aGlzLmZvckVsZW1lbnRfKSB7XG4gICAgICAgIHZhciByZWN0ID0gdGhpcy5mb3JFbGVtZW50Xy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgdmFyIGZvclJlY3QgPSB0aGlzLmZvckVsZW1lbnRfLnBhcmVudEVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIGlmICh0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLlVOQUxJR05FRCkpIHtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLkJPVFRPTV9SSUdIVCkpIHtcbiAgICAgICAgICAgIC8vIFBvc2l0aW9uIGJlbG93IHRoZSBcImZvclwiIGVsZW1lbnQsIGFsaWduZWQgdG8gaXRzIHJpZ2h0LlxuICAgICAgICAgICAgdGhpcy5jb250YWluZXJfLnN0eWxlLnJpZ2h0ID0gZm9yUmVjdC5yaWdodCAtIHJlY3QucmlnaHQgKyAncHgnO1xuICAgICAgICAgICAgdGhpcy5jb250YWluZXJfLnN0eWxlLnRvcCA9IHRoaXMuZm9yRWxlbWVudF8ub2Zmc2V0VG9wICsgdGhpcy5mb3JFbGVtZW50Xy5vZmZzZXRIZWlnaHQgKyAncHgnO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uVE9QX0xFRlQpKSB7XG4gICAgICAgICAgICAvLyBQb3NpdGlvbiBhYm92ZSB0aGUgXCJmb3JcIiBlbGVtZW50LCBhbGlnbmVkIHRvIGl0cyBsZWZ0LlxuICAgICAgICAgICAgdGhpcy5jb250YWluZXJfLnN0eWxlLmxlZnQgPSB0aGlzLmZvckVsZW1lbnRfLm9mZnNldExlZnQgKyAncHgnO1xuICAgICAgICAgICAgdGhpcy5jb250YWluZXJfLnN0eWxlLmJvdHRvbSA9IGZvclJlY3QuYm90dG9tIC0gcmVjdC50b3AgKyAncHgnO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uVE9QX1JJR0hUKSkge1xuICAgICAgICAgICAgLy8gUG9zaXRpb24gYWJvdmUgdGhlIFwiZm9yXCIgZWxlbWVudCwgYWxpZ25lZCB0byBpdHMgcmlnaHQuXG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lcl8uc3R5bGUucmlnaHQgPSBmb3JSZWN0LnJpZ2h0IC0gcmVjdC5yaWdodCArICdweCc7XG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lcl8uc3R5bGUuYm90dG9tID0gZm9yUmVjdC5ib3R0b20gLSByZWN0LnRvcCArICdweCc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBEZWZhdWx0OiBwb3NpdGlvbiBiZWxvdyB0aGUgXCJmb3JcIiBlbGVtZW50LCBhbGlnbmVkIHRvIGl0cyBsZWZ0LlxuICAgICAgICAgICAgdGhpcy5jb250YWluZXJfLnN0eWxlLmxlZnQgPSB0aGlzLmZvckVsZW1lbnRfLm9mZnNldExlZnQgKyAncHgnO1xuICAgICAgICAgICAgdGhpcy5jb250YWluZXJfLnN0eWxlLnRvcCA9IHRoaXMuZm9yRWxlbWVudF8ub2Zmc2V0VG9wICsgdGhpcy5mb3JFbGVtZW50Xy5vZmZzZXRIZWlnaHQgKyAncHgnO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRoaXMudG9nZ2xlKGV2dCk7XG59O1xuLyoqXG4gICAqIEhhbmRsZXMgYSBrZXlib2FyZCBldmVudCBvbiB0aGUgXCJmb3JcIiBlbGVtZW50LlxuICAgKlxuICAgKiBAcGFyYW0ge0V2ZW50fSBldnQgVGhlIGV2ZW50IHRoYXQgZmlyZWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxNZW51LnByb3RvdHlwZS5oYW5kbGVGb3JLZXlib2FyZEV2ZW50XyA9IGZ1bmN0aW9uIChldnQpIHtcbiAgICBpZiAodGhpcy5lbGVtZW50XyAmJiB0aGlzLmNvbnRhaW5lcl8gJiYgdGhpcy5mb3JFbGVtZW50Xykge1xuICAgICAgICB2YXIgaXRlbXMgPSB0aGlzLmVsZW1lbnRfLnF1ZXJ5U2VsZWN0b3JBbGwoJy4nICsgdGhpcy5Dc3NDbGFzc2VzXy5JVEVNICsgJzpub3QoW2Rpc2FibGVkXSknKTtcbiAgICAgICAgaWYgKGl0ZW1zICYmIGl0ZW1zLmxlbmd0aCA+IDAgJiYgdGhpcy5jb250YWluZXJfLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLklTX1ZJU0lCTEUpKSB7XG4gICAgICAgICAgICBpZiAoZXZ0LmtleUNvZGUgPT09IHRoaXMuS2V5Y29kZXNfLlVQX0FSUk9XKSB7XG4gICAgICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgaXRlbXNbaXRlbXMubGVuZ3RoIC0gMV0uZm9jdXMoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZXZ0LmtleUNvZGUgPT09IHRoaXMuS2V5Y29kZXNfLkRPV05fQVJST1cpIHtcbiAgICAgICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBpdGVtc1swXS5mb2N1cygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcbi8qKlxuICAgKiBIYW5kbGVzIGEga2V5Ym9hcmQgZXZlbnQgb24gYW4gaXRlbS5cbiAgICpcbiAgICogQHBhcmFtIHtFdmVudH0gZXZ0IFRoZSBldmVudCB0aGF0IGZpcmVkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsTWVudS5wcm90b3R5cGUuaGFuZGxlSXRlbUtleWJvYXJkRXZlbnRfID0gZnVuY3Rpb24gKGV2dCkge1xuICAgIGlmICh0aGlzLmVsZW1lbnRfICYmIHRoaXMuY29udGFpbmVyXykge1xuICAgICAgICB2YXIgaXRlbXMgPSB0aGlzLmVsZW1lbnRfLnF1ZXJ5U2VsZWN0b3JBbGwoJy4nICsgdGhpcy5Dc3NDbGFzc2VzXy5JVEVNICsgJzpub3QoW2Rpc2FibGVkXSknKTtcbiAgICAgICAgaWYgKGl0ZW1zICYmIGl0ZW1zLmxlbmd0aCA+IDAgJiYgdGhpcy5jb250YWluZXJfLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLklTX1ZJU0lCTEUpKSB7XG4gICAgICAgICAgICB2YXIgY3VycmVudEluZGV4ID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoaXRlbXMpLmluZGV4T2YoZXZ0LnRhcmdldCk7XG4gICAgICAgICAgICBpZiAoZXZ0LmtleUNvZGUgPT09IHRoaXMuS2V5Y29kZXNfLlVQX0FSUk9XKSB7XG4gICAgICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRJbmRleCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbXNbY3VycmVudEluZGV4IC0gMV0uZm9jdXMoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpdGVtc1tpdGVtcy5sZW5ndGggLSAxXS5mb2N1cygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZXZ0LmtleUNvZGUgPT09IHRoaXMuS2V5Y29kZXNfLkRPV05fQVJST1cpIHtcbiAgICAgICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBpZiAoaXRlbXMubGVuZ3RoID4gY3VycmVudEluZGV4ICsgMSkge1xuICAgICAgICAgICAgICAgICAgICBpdGVtc1tjdXJyZW50SW5kZXggKyAxXS5mb2N1cygpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zWzBdLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChldnQua2V5Q29kZSA9PT0gdGhpcy5LZXljb2Rlc18uU1BBQ0UgfHwgZXZ0LmtleUNvZGUgPT09IHRoaXMuS2V5Y29kZXNfLkVOVEVSKSB7XG4gICAgICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgLy8gU2VuZCBtb3VzZWRvd24gYW5kIG1vdXNldXAgdG8gdHJpZ2dlciByaXBwbGUuXG4gICAgICAgICAgICAgICAgdmFyIGUgPSBuZXcgTW91c2VFdmVudCgnbW91c2Vkb3duJyk7XG4gICAgICAgICAgICAgICAgZXZ0LnRhcmdldC5kaXNwYXRjaEV2ZW50KGUpO1xuICAgICAgICAgICAgICAgIGUgPSBuZXcgTW91c2VFdmVudCgnbW91c2V1cCcpO1xuICAgICAgICAgICAgICAgIGV2dC50YXJnZXQuZGlzcGF0Y2hFdmVudChlKTtcbiAgICAgICAgICAgICAgICAvLyBTZW5kIGNsaWNrLlxuICAgICAgICAgICAgICAgIGV2dC50YXJnZXQuY2xpY2soKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZXZ0LmtleUNvZGUgPT09IHRoaXMuS2V5Y29kZXNfLkVTQ0FQRSkge1xuICAgICAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuaGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcbi8qKlxuICAgKiBIYW5kbGVzIGEgY2xpY2sgZXZlbnQgb24gYW4gaXRlbS5cbiAgICpcbiAgICogQHBhcmFtIHtFdmVudH0gZXZ0IFRoZSBldmVudCB0aGF0IGZpcmVkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsTWVudS5wcm90b3R5cGUuaGFuZGxlSXRlbUNsaWNrXyA9IGZ1bmN0aW9uIChldnQpIHtcbiAgICBpZiAoZXZ0LnRhcmdldC5oYXNBdHRyaWJ1dGUoJ2Rpc2FibGVkJykpIHtcbiAgICAgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFdhaXQgc29tZSB0aW1lIGJlZm9yZSBjbG9zaW5nIG1lbnUsIHNvIHRoZSB1c2VyIGNhbiBzZWUgdGhlIHJpcHBsZS5cbiAgICAgICAgdGhpcy5jbG9zaW5nXyA9IHRydWU7XG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgICAgIHRoaXMuaGlkZSgpO1xuICAgICAgICAgICAgdGhpcy5jbG9zaW5nXyA9IGZhbHNlO1xuICAgICAgICB9LmJpbmQodGhpcyksIHRoaXMuQ29uc3RhbnRfLkNMT1NFX1RJTUVPVVQpO1xuICAgIH1cbn07XG4vKipcbiAgICogQ2FsY3VsYXRlcyB0aGUgaW5pdGlhbCBjbGlwIChmb3Igb3BlbmluZyB0aGUgbWVudSkgb3IgZmluYWwgY2xpcCAoZm9yIGNsb3NpbmdcbiAgICogaXQpLCBhbmQgYXBwbGllcyBpdC4gVGhpcyBhbGxvd3MgdXMgdG8gYW5pbWF0ZSBmcm9tIG9yIHRvIHRoZSBjb3JyZWN0IHBvaW50LFxuICAgKiB0aGF0IGlzLCB0aGUgcG9pbnQgaXQncyBhbGlnbmVkIHRvIGluIHRoZSBcImZvclwiIGVsZW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBoZWlnaHQgSGVpZ2h0IG9mIHRoZSBjbGlwIHJlY3RhbmdsZVxuICAgKiBAcGFyYW0ge251bWJlcn0gd2lkdGggV2lkdGggb2YgdGhlIGNsaXAgcmVjdGFuZ2xlXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxNZW51LnByb3RvdHlwZS5hcHBseUNsaXBfID0gZnVuY3Rpb24gKGhlaWdodCwgd2lkdGgpIHtcbiAgICBpZiAodGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5VTkFMSUdORUQpKSB7XG4gICAgICAgIC8vIERvIG5vdCBjbGlwLlxuICAgICAgICB0aGlzLmVsZW1lbnRfLnN0eWxlLmNsaXAgPSAnJztcbiAgICB9IGVsc2UgaWYgKHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uQk9UVE9NX1JJR0hUKSkge1xuICAgICAgICAvLyBDbGlwIHRvIHRoZSB0b3AgcmlnaHQgY29ybmVyIG9mIHRoZSBtZW51LlxuICAgICAgICB0aGlzLmVsZW1lbnRfLnN0eWxlLmNsaXAgPSAncmVjdCgwICcgKyB3aWR0aCArICdweCAnICsgJzAgJyArIHdpZHRoICsgJ3B4KSc7XG4gICAgfSBlbHNlIGlmICh0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLlRPUF9MRUZUKSkge1xuICAgICAgICAvLyBDbGlwIHRvIHRoZSBib3R0b20gbGVmdCBjb3JuZXIgb2YgdGhlIG1lbnUuXG4gICAgICAgIHRoaXMuZWxlbWVudF8uc3R5bGUuY2xpcCA9ICdyZWN0KCcgKyBoZWlnaHQgKyAncHggMCAnICsgaGVpZ2h0ICsgJ3B4IDApJztcbiAgICB9IGVsc2UgaWYgKHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uVE9QX1JJR0hUKSkge1xuICAgICAgICAvLyBDbGlwIHRvIHRoZSBib3R0b20gcmlnaHQgY29ybmVyIG9mIHRoZSBtZW51LlxuICAgICAgICB0aGlzLmVsZW1lbnRfLnN0eWxlLmNsaXAgPSAncmVjdCgnICsgaGVpZ2h0ICsgJ3B4ICcgKyB3aWR0aCArICdweCAnICsgaGVpZ2h0ICsgJ3B4ICcgKyB3aWR0aCArICdweCknO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIERlZmF1bHQ6IGRvIG5vdCBjbGlwIChzYW1lIGFzIGNsaXBwaW5nIHRvIHRoZSB0b3AgbGVmdCBjb3JuZXIpLlxuICAgICAgICB0aGlzLmVsZW1lbnRfLnN0eWxlLmNsaXAgPSAnJztcbiAgICB9XG59O1xuLyoqXG4gICAqIENsZWFudXAgZnVuY3Rpb24gdG8gcmVtb3ZlIGFuaW1hdGlvbiBsaXN0ZW5lcnMuXG4gICAqXG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2dFxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsTWVudS5wcm90b3R5cGUucmVtb3ZlQW5pbWF0aW9uRW5kTGlzdGVuZXJfID0gZnVuY3Rpb24gKGV2dCkge1xuICAgIGV2dC50YXJnZXQuY2xhc3NMaXN0LnJlbW92ZShNYXRlcmlhbE1lbnUucHJvdG90eXBlLkNzc0NsYXNzZXNfLklTX0FOSU1BVElORyk7XG59O1xuLyoqXG4gICAqIEFkZHMgYW4gZXZlbnQgbGlzdGVuZXIgdG8gY2xlYW4gdXAgYWZ0ZXIgdGhlIGFuaW1hdGlvbiBlbmRzLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsTWVudS5wcm90b3R5cGUuYWRkQW5pbWF0aW9uRW5kTGlzdGVuZXJfID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZWxlbWVudF8uYWRkRXZlbnRMaXN0ZW5lcigndHJhbnNpdGlvbmVuZCcsIHRoaXMucmVtb3ZlQW5pbWF0aW9uRW5kTGlzdGVuZXJfKTtcbiAgICB0aGlzLmVsZW1lbnRfLmFkZEV2ZW50TGlzdGVuZXIoJ3dlYmtpdFRyYW5zaXRpb25FbmQnLCB0aGlzLnJlbW92ZUFuaW1hdGlvbkVuZExpc3RlbmVyXyk7XG59O1xuLyoqXG4gICAqIERpc3BsYXlzIHRoZSBtZW51LlxuICAgKlxuICAgKiBAcHVibGljXG4gICAqL1xuTWF0ZXJpYWxNZW51LnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKGV2dCkge1xuICAgIGlmICh0aGlzLmVsZW1lbnRfICYmIHRoaXMuY29udGFpbmVyXyAmJiB0aGlzLm91dGxpbmVfKSB7XG4gICAgICAgIC8vIE1lYXN1cmUgdGhlIGlubmVyIGVsZW1lbnQuXG4gICAgICAgIHZhciBoZWlnaHQgPSB0aGlzLmVsZW1lbnRfLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmhlaWdodDtcbiAgICAgICAgdmFyIHdpZHRoID0gdGhpcy5lbGVtZW50Xy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS53aWR0aDtcbiAgICAgICAgLy8gQXBwbHkgdGhlIGlubmVyIGVsZW1lbnQncyBzaXplIHRvIHRoZSBjb250YWluZXIgYW5kIG91dGxpbmUuXG4gICAgICAgIHRoaXMuY29udGFpbmVyXy5zdHlsZS53aWR0aCA9IHdpZHRoICsgJ3B4JztcbiAgICAgICAgdGhpcy5jb250YWluZXJfLnN0eWxlLmhlaWdodCA9IGhlaWdodCArICdweCc7XG4gICAgICAgIHRoaXMub3V0bGluZV8uc3R5bGUud2lkdGggPSB3aWR0aCArICdweCc7XG4gICAgICAgIHRoaXMub3V0bGluZV8uc3R5bGUuaGVpZ2h0ID0gaGVpZ2h0ICsgJ3B4JztcbiAgICAgICAgdmFyIHRyYW5zaXRpb25EdXJhdGlvbiA9IHRoaXMuQ29uc3RhbnRfLlRSQU5TSVRJT05fRFVSQVRJT05fU0VDT05EUyAqIHRoaXMuQ29uc3RhbnRfLlRSQU5TSVRJT05fRFVSQVRJT05fRlJBQ1RJT047XG4gICAgICAgIC8vIENhbGN1bGF0ZSB0cmFuc2l0aW9uIGRlbGF5cyBmb3IgaW5kaXZpZHVhbCBtZW51IGl0ZW1zLCBzbyB0aGF0IHRoZXkgZmFkZVxuICAgICAgICAvLyBpbiBvbmUgYXQgYSB0aW1lLlxuICAgICAgICB2YXIgaXRlbXMgPSB0aGlzLmVsZW1lbnRfLnF1ZXJ5U2VsZWN0b3JBbGwoJy4nICsgdGhpcy5Dc3NDbGFzc2VzXy5JVEVNKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGl0ZW1EZWxheSA9IG51bGw7XG4gICAgICAgICAgICBpZiAodGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5UT1BfTEVGVCkgfHwgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5UT1BfUklHSFQpKSB7XG4gICAgICAgICAgICAgICAgaXRlbURlbGF5ID0gKGhlaWdodCAtIGl0ZW1zW2ldLm9mZnNldFRvcCAtIGl0ZW1zW2ldLm9mZnNldEhlaWdodCkgLyBoZWlnaHQgKiB0cmFuc2l0aW9uRHVyYXRpb24gKyAncyc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGl0ZW1EZWxheSA9IGl0ZW1zW2ldLm9mZnNldFRvcCAvIGhlaWdodCAqIHRyYW5zaXRpb25EdXJhdGlvbiArICdzJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGl0ZW1zW2ldLnN0eWxlLnRyYW5zaXRpb25EZWxheSA9IGl0ZW1EZWxheTtcbiAgICAgICAgfVxuICAgICAgICAvLyBBcHBseSB0aGUgaW5pdGlhbCBjbGlwIHRvIHRoZSB0ZXh0IGJlZm9yZSB3ZSBzdGFydCBhbmltYXRpbmcuXG4gICAgICAgIHRoaXMuYXBwbHlDbGlwXyhoZWlnaHQsIHdpZHRoKTtcbiAgICAgICAgLy8gV2FpdCBmb3IgdGhlIG5leHQgZnJhbWUsIHR1cm4gb24gYW5pbWF0aW9uLCBhbmQgYXBwbHkgdGhlIGZpbmFsIGNsaXAuXG4gICAgICAgIC8vIEFsc28gbWFrZSBpdCB2aXNpYmxlLiBUaGlzIHRyaWdnZXJzIHRoZSB0cmFuc2l0aW9ucy5cbiAgICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JU19BTklNQVRJTkcpO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50Xy5zdHlsZS5jbGlwID0gJ3JlY3QoMCAnICsgd2lkdGggKyAncHggJyArIGhlaWdodCArICdweCAwKSc7XG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lcl8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLklTX1ZJU0lCTEUpO1xuICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAvLyBDbGVhbiB1cCBhZnRlciB0aGUgYW5pbWF0aW9uIGlzIGNvbXBsZXRlLlxuICAgICAgICB0aGlzLmFkZEFuaW1hdGlvbkVuZExpc3RlbmVyXygpO1xuICAgICAgICAvLyBBZGQgYSBjbGljayBsaXN0ZW5lciB0byB0aGUgZG9jdW1lbnQsIHRvIGNsb3NlIHRoZSBtZW51LlxuICAgICAgICB2YXIgY2FsbGJhY2sgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgLy8gQ2hlY2sgdG8gc2VlIGlmIHRoZSBkb2N1bWVudCBpcyBwcm9jZXNzaW5nIHRoZSBzYW1lIGV2ZW50IHRoYXRcbiAgICAgICAgICAgIC8vIGRpc3BsYXllZCB0aGUgbWVudSBpbiB0aGUgZmlyc3QgcGxhY2UuIElmIHNvLCBkbyBub3RoaW5nLlxuICAgICAgICAgICAgLy8gQWxzbyBjaGVjayB0byBzZWUgaWYgdGhlIG1lbnUgaXMgaW4gdGhlIHByb2Nlc3Mgb2YgY2xvc2luZyBpdHNlbGYsIGFuZFxuICAgICAgICAgICAgLy8gZG8gbm90aGluZyBpbiB0aGF0IGNhc2UuXG4gICAgICAgICAgICAvLyBBbHNvIGNoZWNrIGlmIHRoZSBjbGlja2VkIGVsZW1lbnQgaXMgYSBtZW51IGl0ZW1cbiAgICAgICAgICAgIC8vIGlmIHNvLCBkbyBub3RoaW5nLlxuICAgICAgICAgICAgaWYgKGUgIT09IGV2dCAmJiAhdGhpcy5jbG9zaW5nXyAmJiBlLnRhcmdldC5wYXJlbnROb2RlICE9PSB0aGlzLmVsZW1lbnRfKSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjYWxsYmFjayk7XG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0uYmluZCh0aGlzKTtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjYWxsYmFjayk7XG4gICAgfVxufTtcbk1hdGVyaWFsTWVudS5wcm90b3R5cGVbJ3Nob3cnXSA9IE1hdGVyaWFsTWVudS5wcm90b3R5cGUuc2hvdztcbi8qKlxuICAgKiBIaWRlcyB0aGUgbWVudS5cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKi9cbk1hdGVyaWFsTWVudS5wcm90b3R5cGUuaGlkZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5lbGVtZW50XyAmJiB0aGlzLmNvbnRhaW5lcl8gJiYgdGhpcy5vdXRsaW5lXykge1xuICAgICAgICB2YXIgaXRlbXMgPSB0aGlzLmVsZW1lbnRfLnF1ZXJ5U2VsZWN0b3JBbGwoJy4nICsgdGhpcy5Dc3NDbGFzc2VzXy5JVEVNKTtcbiAgICAgICAgLy8gUmVtb3ZlIGFsbCB0cmFuc2l0aW9uIGRlbGF5czsgbWVudSBpdGVtcyBmYWRlIG91dCBjb25jdXJyZW50bHkuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaXRlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGl0ZW1zW2ldLnN0eWxlLnJlbW92ZVByb3BlcnR5KCd0cmFuc2l0aW9uLWRlbGF5Jyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gTWVhc3VyZSB0aGUgaW5uZXIgZWxlbWVudC5cbiAgICAgICAgdmFyIHJlY3QgPSB0aGlzLmVsZW1lbnRfLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICB2YXIgaGVpZ2h0ID0gcmVjdC5oZWlnaHQ7XG4gICAgICAgIHZhciB3aWR0aCA9IHJlY3Qud2lkdGg7XG4gICAgICAgIC8vIFR1cm4gb24gYW5pbWF0aW9uLCBhbmQgYXBwbHkgdGhlIGZpbmFsIGNsaXAuIEFsc28gbWFrZSBpbnZpc2libGUuXG4gICAgICAgIC8vIFRoaXMgdHJpZ2dlcnMgdGhlIHRyYW5zaXRpb25zLlxuICAgICAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JU19BTklNQVRJTkcpO1xuICAgICAgICB0aGlzLmFwcGx5Q2xpcF8oaGVpZ2h0LCB3aWR0aCk7XG4gICAgICAgIHRoaXMuY29udGFpbmVyXy5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfVklTSUJMRSk7XG4gICAgICAgIC8vIENsZWFuIHVwIGFmdGVyIHRoZSBhbmltYXRpb24gaXMgY29tcGxldGUuXG4gICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uRW5kTGlzdGVuZXJfKCk7XG4gICAgfVxufTtcbk1hdGVyaWFsTWVudS5wcm90b3R5cGVbJ2hpZGUnXSA9IE1hdGVyaWFsTWVudS5wcm90b3R5cGUuaGlkZTtcbi8qKlxuICAgKiBEaXNwbGF5cyBvciBoaWRlcyB0aGUgbWVudSwgZGVwZW5kaW5nIG9uIGN1cnJlbnQgc3RhdGUuXG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICovXG5NYXRlcmlhbE1lbnUucHJvdG90eXBlLnRvZ2dsZSA9IGZ1bmN0aW9uIChldnQpIHtcbiAgICBpZiAodGhpcy5jb250YWluZXJfLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLklTX1ZJU0lCTEUpKSB7XG4gICAgICAgIHRoaXMuaGlkZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuc2hvdyhldnQpO1xuICAgIH1cbn07XG5NYXRlcmlhbE1lbnUucHJvdG90eXBlWyd0b2dnbGUnXSA9IE1hdGVyaWFsTWVudS5wcm90b3R5cGUudG9nZ2xlO1xuLy8gVGhlIGNvbXBvbmVudCByZWdpc3RlcnMgaXRzZWxmLiBJdCBjYW4gYXNzdW1lIGNvbXBvbmVudEhhbmRsZXIgaXMgYXZhaWxhYmxlXG4vLyBpbiB0aGUgZ2xvYmFsIHNjb3BlLlxuY29tcG9uZW50SGFuZGxlci5yZWdpc3Rlcih7XG4gICAgY29uc3RydWN0b3I6IE1hdGVyaWFsTWVudSxcbiAgICBjbGFzc0FzU3RyaW5nOiAnTWF0ZXJpYWxNZW51JyxcbiAgICBjc3NDbGFzczogJ21kbC1qcy1tZW51JyxcbiAgICB3aWRnZXQ6IHRydWVcbn0pO1xuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTUgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAgICogQ2xhc3MgY29uc3RydWN0b3IgZm9yIFByb2dyZXNzIE1ETCBjb21wb25lbnQuXG4gICAqIEltcGxlbWVudHMgTURMIGNvbXBvbmVudCBkZXNpZ24gcGF0dGVybiBkZWZpbmVkIGF0OlxuICAgKiBodHRwczovL2dpdGh1Yi5jb20vamFzb25tYXllcy9tZGwtY29tcG9uZW50LWRlc2lnbi1wYXR0ZXJuXG4gICAqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbGVtZW50IFRoZSBlbGVtZW50IHRoYXQgd2lsbCBiZSB1cGdyYWRlZC5cbiAgICovXG52YXIgTWF0ZXJpYWxQcm9ncmVzcyA9IGZ1bmN0aW9uIE1hdGVyaWFsUHJvZ3Jlc3MoZWxlbWVudCkge1xuICAgIHRoaXMuZWxlbWVudF8gPSBlbGVtZW50O1xuICAgIC8vIEluaXRpYWxpemUgaW5zdGFuY2UuXG4gICAgdGhpcy5pbml0KCk7XG59O1xud2luZG93WydNYXRlcmlhbFByb2dyZXNzJ10gPSBNYXRlcmlhbFByb2dyZXNzO1xuLyoqXG4gICAqIFN0b3JlIGNvbnN0YW50cyBpbiBvbmUgcGxhY2Ugc28gdGhleSBjYW4gYmUgdXBkYXRlZCBlYXNpbHkuXG4gICAqXG4gICAqIEBlbnVtIHtzdHJpbmcgfCBudW1iZXJ9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxQcm9ncmVzcy5wcm90b3R5cGUuQ29uc3RhbnRfID0ge307XG4vKipcbiAgICogU3RvcmUgc3RyaW5ncyBmb3IgY2xhc3MgbmFtZXMgZGVmaW5lZCBieSB0aGlzIGNvbXBvbmVudCB0aGF0IGFyZSB1c2VkIGluXG4gICAqIEphdmFTY3JpcHQuIFRoaXMgYWxsb3dzIHVzIHRvIHNpbXBseSBjaGFuZ2UgaXQgaW4gb25lIHBsYWNlIHNob3VsZCB3ZVxuICAgKiBkZWNpZGUgdG8gbW9kaWZ5IGF0IGEgbGF0ZXIgZGF0ZS5cbiAgICpcbiAgICogQGVudW0ge3N0cmluZ31cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFByb2dyZXNzLnByb3RvdHlwZS5Dc3NDbGFzc2VzXyA9IHsgSU5ERVRFUk1JTkFURV9DTEFTUzogJ21kbC1wcm9ncmVzc19faW5kZXRlcm1pbmF0ZScgfTtcbi8qKlxuICAgKiBTZXQgdGhlIGN1cnJlbnQgcHJvZ3Jlc3Mgb2YgdGhlIHByb2dyZXNzYmFyLlxuICAgKlxuICAgKiBAcGFyYW0ge251bWJlcn0gcCBQZXJjZW50YWdlIG9mIHRoZSBwcm9ncmVzcyAoMC0xMDApXG4gICAqIEBwdWJsaWNcbiAgICovXG5NYXRlcmlhbFByb2dyZXNzLnByb3RvdHlwZS5zZXRQcm9ncmVzcyA9IGZ1bmN0aW9uIChwKSB7XG4gICAgaWYgKHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uSU5ERVRFUk1JTkFURV9DTEFTUykpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnByb2dyZXNzYmFyXy5zdHlsZS53aWR0aCA9IHAgKyAnJSc7XG59O1xuTWF0ZXJpYWxQcm9ncmVzcy5wcm90b3R5cGVbJ3NldFByb2dyZXNzJ10gPSBNYXRlcmlhbFByb2dyZXNzLnByb3RvdHlwZS5zZXRQcm9ncmVzcztcbi8qKlxuICAgKiBTZXQgdGhlIGN1cnJlbnQgcHJvZ3Jlc3Mgb2YgdGhlIGJ1ZmZlci5cbiAgICpcbiAgICogQHBhcmFtIHtudW1iZXJ9IHAgUGVyY2VudGFnZSBvZiB0aGUgYnVmZmVyICgwLTEwMClcbiAgICogQHB1YmxpY1xuICAgKi9cbk1hdGVyaWFsUHJvZ3Jlc3MucHJvdG90eXBlLnNldEJ1ZmZlciA9IGZ1bmN0aW9uIChwKSB7XG4gICAgdGhpcy5idWZmZXJiYXJfLnN0eWxlLndpZHRoID0gcCArICclJztcbiAgICB0aGlzLmF1eGJhcl8uc3R5bGUud2lkdGggPSAxMDAgLSBwICsgJyUnO1xufTtcbk1hdGVyaWFsUHJvZ3Jlc3MucHJvdG90eXBlWydzZXRCdWZmZXInXSA9IE1hdGVyaWFsUHJvZ3Jlc3MucHJvdG90eXBlLnNldEJ1ZmZlcjtcbi8qKlxuICAgKiBJbml0aWFsaXplIGVsZW1lbnQuXG4gICAqL1xuTWF0ZXJpYWxQcm9ncmVzcy5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5lbGVtZW50Xykge1xuICAgICAgICB2YXIgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgZWwuY2xhc3NOYW1lID0gJ3Byb2dyZXNzYmFyIGJhciBiYXIxJztcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5hcHBlbmRDaGlsZChlbCk7XG4gICAgICAgIHRoaXMucHJvZ3Jlc3NiYXJfID0gZWw7XG4gICAgICAgIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIGVsLmNsYXNzTmFtZSA9ICdidWZmZXJiYXIgYmFyIGJhcjInO1xuICAgICAgICB0aGlzLmVsZW1lbnRfLmFwcGVuZENoaWxkKGVsKTtcbiAgICAgICAgdGhpcy5idWZmZXJiYXJfID0gZWw7XG4gICAgICAgIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIGVsLmNsYXNzTmFtZSA9ICdhdXhiYXIgYmFyIGJhcjMnO1xuICAgICAgICB0aGlzLmVsZW1lbnRfLmFwcGVuZENoaWxkKGVsKTtcbiAgICAgICAgdGhpcy5hdXhiYXJfID0gZWw7XG4gICAgICAgIHRoaXMucHJvZ3Jlc3NiYXJfLnN0eWxlLndpZHRoID0gJzAlJztcbiAgICAgICAgdGhpcy5idWZmZXJiYXJfLnN0eWxlLndpZHRoID0gJzEwMCUnO1xuICAgICAgICB0aGlzLmF1eGJhcl8uc3R5bGUud2lkdGggPSAnMCUnO1xuICAgICAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5hZGQoJ2lzLXVwZ3JhZGVkJyk7XG4gICAgfVxufTtcbi8vIFRoZSBjb21wb25lbnQgcmVnaXN0ZXJzIGl0c2VsZi4gSXQgY2FuIGFzc3VtZSBjb21wb25lbnRIYW5kbGVyIGlzIGF2YWlsYWJsZVxuLy8gaW4gdGhlIGdsb2JhbCBzY29wZS5cbmNvbXBvbmVudEhhbmRsZXIucmVnaXN0ZXIoe1xuICAgIGNvbnN0cnVjdG9yOiBNYXRlcmlhbFByb2dyZXNzLFxuICAgIGNsYXNzQXNTdHJpbmc6ICdNYXRlcmlhbFByb2dyZXNzJyxcbiAgICBjc3NDbGFzczogJ21kbC1qcy1wcm9ncmVzcycsXG4gICAgd2lkZ2V0OiB0cnVlXG59KTtcbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE1IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gICAqIENsYXNzIGNvbnN0cnVjdG9yIGZvciBSYWRpbyBNREwgY29tcG9uZW50LlxuICAgKiBJbXBsZW1lbnRzIE1ETCBjb21wb25lbnQgZGVzaWduIHBhdHRlcm4gZGVmaW5lZCBhdDpcbiAgICogaHR0cHM6Ly9naXRodWIuY29tL2phc29ubWF5ZXMvbWRsLWNvbXBvbmVudC1kZXNpZ24tcGF0dGVyblxuICAgKlxuICAgKiBAY29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxlbWVudCBUaGUgZWxlbWVudCB0aGF0IHdpbGwgYmUgdXBncmFkZWQuXG4gICAqL1xudmFyIE1hdGVyaWFsUmFkaW8gPSBmdW5jdGlvbiBNYXRlcmlhbFJhZGlvKGVsZW1lbnQpIHtcbiAgICB0aGlzLmVsZW1lbnRfID0gZWxlbWVudDtcbiAgICAvLyBJbml0aWFsaXplIGluc3RhbmNlLlxuICAgIHRoaXMuaW5pdCgpO1xufTtcbndpbmRvd1snTWF0ZXJpYWxSYWRpbyddID0gTWF0ZXJpYWxSYWRpbztcbi8qKlxuICAgKiBTdG9yZSBjb25zdGFudHMgaW4gb25lIHBsYWNlIHNvIHRoZXkgY2FuIGJlIHVwZGF0ZWQgZWFzaWx5LlxuICAgKlxuICAgKiBAZW51bSB7c3RyaW5nIHwgbnVtYmVyfVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsUmFkaW8ucHJvdG90eXBlLkNvbnN0YW50XyA9IHsgVElOWV9USU1FT1VUOiAwLjAwMSB9O1xuLyoqXG4gICAqIFN0b3JlIHN0cmluZ3MgZm9yIGNsYXNzIG5hbWVzIGRlZmluZWQgYnkgdGhpcyBjb21wb25lbnQgdGhhdCBhcmUgdXNlZCBpblxuICAgKiBKYXZhU2NyaXB0LiBUaGlzIGFsbG93cyB1cyB0byBzaW1wbHkgY2hhbmdlIGl0IGluIG9uZSBwbGFjZSBzaG91bGQgd2VcbiAgICogZGVjaWRlIHRvIG1vZGlmeSBhdCBhIGxhdGVyIGRhdGUuXG4gICAqXG4gICAqIEBlbnVtIHtzdHJpbmd9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxSYWRpby5wcm90b3R5cGUuQ3NzQ2xhc3Nlc18gPSB7XG4gICAgSVNfRk9DVVNFRDogJ2lzLWZvY3VzZWQnLFxuICAgIElTX0RJU0FCTEVEOiAnaXMtZGlzYWJsZWQnLFxuICAgIElTX0NIRUNLRUQ6ICdpcy1jaGVja2VkJyxcbiAgICBJU19VUEdSQURFRDogJ2lzLXVwZ3JhZGVkJyxcbiAgICBKU19SQURJTzogJ21kbC1qcy1yYWRpbycsXG4gICAgUkFESU9fQlROOiAnbWRsLXJhZGlvX19idXR0b24nLFxuICAgIFJBRElPX09VVEVSX0NJUkNMRTogJ21kbC1yYWRpb19fb3V0ZXItY2lyY2xlJyxcbiAgICBSQURJT19JTk5FUl9DSVJDTEU6ICdtZGwtcmFkaW9fX2lubmVyLWNpcmNsZScsXG4gICAgUklQUExFX0VGRkVDVDogJ21kbC1qcy1yaXBwbGUtZWZmZWN0JyxcbiAgICBSSVBQTEVfSUdOT1JFX0VWRU5UUzogJ21kbC1qcy1yaXBwbGUtZWZmZWN0LS1pZ25vcmUtZXZlbnRzJyxcbiAgICBSSVBQTEVfQ09OVEFJTkVSOiAnbWRsLXJhZGlvX19yaXBwbGUtY29udGFpbmVyJyxcbiAgICBSSVBQTEVfQ0VOVEVSOiAnbWRsLXJpcHBsZS0tY2VudGVyJyxcbiAgICBSSVBQTEU6ICdtZGwtcmlwcGxlJ1xufTtcbi8qKlxuICAgKiBIYW5kbGUgY2hhbmdlIG9mIHN0YXRlLlxuICAgKlxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudCBUaGUgZXZlbnQgdGhhdCBmaXJlZC5cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFJhZGlvLnByb3RvdHlwZS5vbkNoYW5nZV8gPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAvLyBTaW5jZSBvdGhlciByYWRpbyBidXR0b25zIGRvbid0IGdldCBjaGFuZ2UgZXZlbnRzLCB3ZSBuZWVkIHRvIGxvb2sgZm9yXG4gICAgLy8gdGhlbSB0byB1cGRhdGUgdGhlaXIgY2xhc3Nlcy5cbiAgICB2YXIgcmFkaW9zID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSh0aGlzLkNzc0NsYXNzZXNfLkpTX1JBRElPKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJhZGlvcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgYnV0dG9uID0gcmFkaW9zW2ldLnF1ZXJ5U2VsZWN0b3IoJy4nICsgdGhpcy5Dc3NDbGFzc2VzXy5SQURJT19CVE4pO1xuICAgICAgICAvLyBEaWZmZXJlbnQgbmFtZSA9PSBkaWZmZXJlbnQgZ3JvdXAsIHNvIG5vIHBvaW50IHVwZGF0aW5nIHRob3NlLlxuICAgICAgICBpZiAoYnV0dG9uLmdldEF0dHJpYnV0ZSgnbmFtZScpID09PSB0aGlzLmJ0bkVsZW1lbnRfLmdldEF0dHJpYnV0ZSgnbmFtZScpKSB7XG4gICAgICAgICAgICByYWRpb3NbaV1bJ01hdGVyaWFsUmFkaW8nXS51cGRhdGVDbGFzc2VzXygpO1xuICAgICAgICB9XG4gICAgfVxufTtcbi8qKlxuICAgKiBIYW5kbGUgZm9jdXMuXG4gICAqXG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IFRoZSBldmVudCB0aGF0IGZpcmVkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsUmFkaW8ucHJvdG90eXBlLm9uRm9jdXNfID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfRk9DVVNFRCk7XG59O1xuLyoqXG4gICAqIEhhbmRsZSBsb3N0IGZvY3VzLlxuICAgKlxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudCBUaGUgZXZlbnQgdGhhdCBmaXJlZC5cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFJhZGlvLnByb3RvdHlwZS5vbkJsdXJfID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfRk9DVVNFRCk7XG59O1xuLyoqXG4gICAqIEhhbmRsZSBtb3VzZXVwLlxuICAgKlxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudCBUaGUgZXZlbnQgdGhhdCBmaXJlZC5cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFJhZGlvLnByb3RvdHlwZS5vbk1vdXNldXBfID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdGhpcy5ibHVyXygpO1xufTtcbi8qKlxuICAgKiBVcGRhdGUgY2xhc3Nlcy5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFJhZGlvLnByb3RvdHlwZS51cGRhdGVDbGFzc2VzXyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmNoZWNrRGlzYWJsZWQoKTtcbiAgICB0aGlzLmNoZWNrVG9nZ2xlU3RhdGUoKTtcbn07XG4vKipcbiAgICogQWRkIGJsdXIuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxSYWRpby5wcm90b3R5cGUuYmx1cl8gPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gVE9ETzogZmlndXJlIG91dCB3aHkgdGhlcmUncyBhIGZvY3VzIGV2ZW50IGJlaW5nIGZpcmVkIGFmdGVyIG91ciBibHVyLFxuICAgIC8vIHNvIHRoYXQgd2UgY2FuIGF2b2lkIHRoaXMgaGFjay5cbiAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuYnRuRWxlbWVudF8uYmx1cigpO1xuICAgIH0uYmluZCh0aGlzKSwgdGhpcy5Db25zdGFudF8uVElOWV9USU1FT1VUKTtcbn07XG4vLyBQdWJsaWMgbWV0aG9kcy5cbi8qKlxuICAgKiBDaGVjayB0aGUgY29tcG9uZW50cyBkaXNhYmxlZCBzdGF0ZS5cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKi9cbk1hdGVyaWFsUmFkaW8ucHJvdG90eXBlLmNoZWNrRGlzYWJsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuYnRuRWxlbWVudF8uZGlzYWJsZWQpIHtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfRElTQUJMRUQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LnJlbW92ZSh0aGlzLkNzc0NsYXNzZXNfLklTX0RJU0FCTEVEKTtcbiAgICB9XG59O1xuTWF0ZXJpYWxSYWRpby5wcm90b3R5cGVbJ2NoZWNrRGlzYWJsZWQnXSA9IE1hdGVyaWFsUmFkaW8ucHJvdG90eXBlLmNoZWNrRGlzYWJsZWQ7XG4vKipcbiAgICogQ2hlY2sgdGhlIGNvbXBvbmVudHMgdG9nZ2xlZCBzdGF0ZS5cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKi9cbk1hdGVyaWFsUmFkaW8ucHJvdG90eXBlLmNoZWNrVG9nZ2xlU3RhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuYnRuRWxlbWVudF8uY2hlY2tlZCkge1xuICAgICAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JU19DSEVDS0VEKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5yZW1vdmUodGhpcy5Dc3NDbGFzc2VzXy5JU19DSEVDS0VEKTtcbiAgICB9XG59O1xuTWF0ZXJpYWxSYWRpby5wcm90b3R5cGVbJ2NoZWNrVG9nZ2xlU3RhdGUnXSA9IE1hdGVyaWFsUmFkaW8ucHJvdG90eXBlLmNoZWNrVG9nZ2xlU3RhdGU7XG4vKipcbiAgICogRGlzYWJsZSByYWRpby5cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKi9cbk1hdGVyaWFsUmFkaW8ucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5idG5FbGVtZW50Xy5kaXNhYmxlZCA9IHRydWU7XG4gICAgdGhpcy51cGRhdGVDbGFzc2VzXygpO1xufTtcbk1hdGVyaWFsUmFkaW8ucHJvdG90eXBlWydkaXNhYmxlJ10gPSBNYXRlcmlhbFJhZGlvLnByb3RvdHlwZS5kaXNhYmxlO1xuLyoqXG4gICAqIEVuYWJsZSByYWRpby5cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKi9cbk1hdGVyaWFsUmFkaW8ucHJvdG90eXBlLmVuYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmJ0bkVsZW1lbnRfLmRpc2FibGVkID0gZmFsc2U7XG4gICAgdGhpcy51cGRhdGVDbGFzc2VzXygpO1xufTtcbk1hdGVyaWFsUmFkaW8ucHJvdG90eXBlWydlbmFibGUnXSA9IE1hdGVyaWFsUmFkaW8ucHJvdG90eXBlLmVuYWJsZTtcbi8qKlxuICAgKiBDaGVjayByYWRpby5cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKi9cbk1hdGVyaWFsUmFkaW8ucHJvdG90eXBlLmNoZWNrID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuYnRuRWxlbWVudF8uY2hlY2tlZCA9IHRydWU7XG4gICAgdGhpcy51cGRhdGVDbGFzc2VzXygpO1xufTtcbk1hdGVyaWFsUmFkaW8ucHJvdG90eXBlWydjaGVjayddID0gTWF0ZXJpYWxSYWRpby5wcm90b3R5cGUuY2hlY2s7XG4vKipcbiAgICogVW5jaGVjayByYWRpby5cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKi9cbk1hdGVyaWFsUmFkaW8ucHJvdG90eXBlLnVuY2hlY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5idG5FbGVtZW50Xy5jaGVja2VkID0gZmFsc2U7XG4gICAgdGhpcy51cGRhdGVDbGFzc2VzXygpO1xufTtcbk1hdGVyaWFsUmFkaW8ucHJvdG90eXBlWyd1bmNoZWNrJ10gPSBNYXRlcmlhbFJhZGlvLnByb3RvdHlwZS51bmNoZWNrO1xuLyoqXG4gICAqIEluaXRpYWxpemUgZWxlbWVudC5cbiAgICovXG5NYXRlcmlhbFJhZGlvLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmVsZW1lbnRfKSB7XG4gICAgICAgIHRoaXMuYnRuRWxlbWVudF8gPSB0aGlzLmVsZW1lbnRfLnF1ZXJ5U2VsZWN0b3IoJy4nICsgdGhpcy5Dc3NDbGFzc2VzXy5SQURJT19CVE4pO1xuICAgICAgICB0aGlzLmJvdW5kQ2hhbmdlSGFuZGxlcl8gPSB0aGlzLm9uQ2hhbmdlXy5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmJvdW5kRm9jdXNIYW5kbGVyXyA9IHRoaXMub25DaGFuZ2VfLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuYm91bmRCbHVySGFuZGxlcl8gPSB0aGlzLm9uQmx1cl8uYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5ib3VuZE1vdXNlVXBIYW5kbGVyXyA9IHRoaXMub25Nb3VzZXVwXy5iaW5kKHRoaXMpO1xuICAgICAgICB2YXIgb3V0ZXJDaXJjbGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgIG91dGVyQ2lyY2xlLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5SQURJT19PVVRFUl9DSVJDTEUpO1xuICAgICAgICB2YXIgaW5uZXJDaXJjbGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgIGlubmVyQ2lyY2xlLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5SQURJT19JTk5FUl9DSVJDTEUpO1xuICAgICAgICB0aGlzLmVsZW1lbnRfLmFwcGVuZENoaWxkKG91dGVyQ2lyY2xlKTtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5hcHBlbmRDaGlsZChpbm5lckNpcmNsZSk7XG4gICAgICAgIHZhciByaXBwbGVDb250YWluZXI7XG4gICAgICAgIGlmICh0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLlJJUFBMRV9FRkZFQ1QpKSB7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5SSVBQTEVfSUdOT1JFX0VWRU5UUyk7XG4gICAgICAgICAgICByaXBwbGVDb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICByaXBwbGVDb250YWluZXIuY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLlJJUFBMRV9DT05UQUlORVIpO1xuICAgICAgICAgICAgcmlwcGxlQ29udGFpbmVyLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5SSVBQTEVfRUZGRUNUKTtcbiAgICAgICAgICAgIHJpcHBsZUNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uUklQUExFX0NFTlRFUik7XG4gICAgICAgICAgICByaXBwbGVDb250YWluZXIuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuYm91bmRNb3VzZVVwSGFuZGxlcl8pO1xuICAgICAgICAgICAgdmFyIHJpcHBsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgIHJpcHBsZS5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uUklQUExFKTtcbiAgICAgICAgICAgIHJpcHBsZUNvbnRhaW5lci5hcHBlbmRDaGlsZChyaXBwbGUpO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50Xy5hcHBlbmRDaGlsZChyaXBwbGVDb250YWluZXIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYnRuRWxlbWVudF8uYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgdGhpcy5ib3VuZENoYW5nZUhhbmRsZXJfKTtcbiAgICAgICAgdGhpcy5idG5FbGVtZW50Xy5hZGRFdmVudExpc3RlbmVyKCdmb2N1cycsIHRoaXMuYm91bmRGb2N1c0hhbmRsZXJfKTtcbiAgICAgICAgdGhpcy5idG5FbGVtZW50Xy5hZGRFdmVudExpc3RlbmVyKCdibHVyJywgdGhpcy5ib3VuZEJsdXJIYW5kbGVyXyk7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuYm91bmRNb3VzZVVwSGFuZGxlcl8pO1xuICAgICAgICB0aGlzLnVwZGF0ZUNsYXNzZXNfKCk7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLklTX1VQR1JBREVEKTtcbiAgICB9XG59O1xuLy8gVGhlIGNvbXBvbmVudCByZWdpc3RlcnMgaXRzZWxmLiBJdCBjYW4gYXNzdW1lIGNvbXBvbmVudEhhbmRsZXIgaXMgYXZhaWxhYmxlXG4vLyBpbiB0aGUgZ2xvYmFsIHNjb3BlLlxuY29tcG9uZW50SGFuZGxlci5yZWdpc3Rlcih7XG4gICAgY29uc3RydWN0b3I6IE1hdGVyaWFsUmFkaW8sXG4gICAgY2xhc3NBc1N0cmluZzogJ01hdGVyaWFsUmFkaW8nLFxuICAgIGNzc0NsYXNzOiAnbWRsLWpzLXJhZGlvJyxcbiAgICB3aWRnZXQ6IHRydWVcbn0pO1xuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTUgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAgICogQ2xhc3MgY29uc3RydWN0b3IgZm9yIFNsaWRlciBNREwgY29tcG9uZW50LlxuICAgKiBJbXBsZW1lbnRzIE1ETCBjb21wb25lbnQgZGVzaWduIHBhdHRlcm4gZGVmaW5lZCBhdDpcbiAgICogaHR0cHM6Ly9naXRodWIuY29tL2phc29ubWF5ZXMvbWRsLWNvbXBvbmVudC1kZXNpZ24tcGF0dGVyblxuICAgKlxuICAgKiBAY29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxlbWVudCBUaGUgZWxlbWVudCB0aGF0IHdpbGwgYmUgdXBncmFkZWQuXG4gICAqL1xudmFyIE1hdGVyaWFsU2xpZGVyID0gZnVuY3Rpb24gTWF0ZXJpYWxTbGlkZXIoZWxlbWVudCkge1xuICAgIHRoaXMuZWxlbWVudF8gPSBlbGVtZW50O1xuICAgIC8vIEJyb3dzZXIgZmVhdHVyZSBkZXRlY3Rpb24uXG4gICAgdGhpcy5pc0lFXyA9IHdpbmRvdy5uYXZpZ2F0b3IubXNQb2ludGVyRW5hYmxlZDtcbiAgICAvLyBJbml0aWFsaXplIGluc3RhbmNlLlxuICAgIHRoaXMuaW5pdCgpO1xufTtcbndpbmRvd1snTWF0ZXJpYWxTbGlkZXInXSA9IE1hdGVyaWFsU2xpZGVyO1xuLyoqXG4gICAqIFN0b3JlIGNvbnN0YW50cyBpbiBvbmUgcGxhY2Ugc28gdGhleSBjYW4gYmUgdXBkYXRlZCBlYXNpbHkuXG4gICAqXG4gICAqIEBlbnVtIHtzdHJpbmcgfCBudW1iZXJ9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxTbGlkZXIucHJvdG90eXBlLkNvbnN0YW50XyA9IHt9O1xuLyoqXG4gICAqIFN0b3JlIHN0cmluZ3MgZm9yIGNsYXNzIG5hbWVzIGRlZmluZWQgYnkgdGhpcyBjb21wb25lbnQgdGhhdCBhcmUgdXNlZCBpblxuICAgKiBKYXZhU2NyaXB0LiBUaGlzIGFsbG93cyB1cyB0byBzaW1wbHkgY2hhbmdlIGl0IGluIG9uZSBwbGFjZSBzaG91bGQgd2VcbiAgICogZGVjaWRlIHRvIG1vZGlmeSBhdCBhIGxhdGVyIGRhdGUuXG4gICAqXG4gICAqIEBlbnVtIHtzdHJpbmd9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxTbGlkZXIucHJvdG90eXBlLkNzc0NsYXNzZXNfID0ge1xuICAgIElFX0NPTlRBSU5FUjogJ21kbC1zbGlkZXJfX2llLWNvbnRhaW5lcicsXG4gICAgU0xJREVSX0NPTlRBSU5FUjogJ21kbC1zbGlkZXJfX2NvbnRhaW5lcicsXG4gICAgQkFDS0dST1VORF9GTEVYOiAnbWRsLXNsaWRlcl9fYmFja2dyb3VuZC1mbGV4JyxcbiAgICBCQUNLR1JPVU5EX0xPV0VSOiAnbWRsLXNsaWRlcl9fYmFja2dyb3VuZC1sb3dlcicsXG4gICAgQkFDS0dST1VORF9VUFBFUjogJ21kbC1zbGlkZXJfX2JhY2tncm91bmQtdXBwZXInLFxuICAgIElTX0xPV0VTVF9WQUxVRTogJ2lzLWxvd2VzdC12YWx1ZScsXG4gICAgSVNfVVBHUkFERUQ6ICdpcy11cGdyYWRlZCdcbn07XG4vKipcbiAgICogSGFuZGxlIGlucHV0IG9uIGVsZW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IFRoZSBldmVudCB0aGF0IGZpcmVkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsU2xpZGVyLnByb3RvdHlwZS5vbklucHV0XyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHRoaXMudXBkYXRlVmFsdWVTdHlsZXNfKCk7XG59O1xuLyoqXG4gICAqIEhhbmRsZSBjaGFuZ2Ugb24gZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnQgVGhlIGV2ZW50IHRoYXQgZmlyZWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxTbGlkZXIucHJvdG90eXBlLm9uQ2hhbmdlXyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHRoaXMudXBkYXRlVmFsdWVTdHlsZXNfKCk7XG59O1xuLyoqXG4gICAqIEhhbmRsZSBtb3VzZXVwIG9uIGVsZW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IFRoZSBldmVudCB0aGF0IGZpcmVkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsU2xpZGVyLnByb3RvdHlwZS5vbk1vdXNlVXBfID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgZXZlbnQudGFyZ2V0LmJsdXIoKTtcbn07XG4vKipcbiAgICogSGFuZGxlIG1vdXNlZG93biBvbiBjb250YWluZXIgZWxlbWVudC5cbiAgICogVGhpcyBoYW5kbGVyIGlzIHB1cnBvc2UgaXMgdG8gbm90IHJlcXVpcmUgdGhlIHVzZSB0byBjbGlja1xuICAgKiBleGFjdGx5IG9uIHRoZSAycHggc2xpZGVyIGVsZW1lbnQsIGFzIEZpcmVGb3ggc2VlbXMgdG8gYmUgdmVyeVxuICAgKiBzdHJpY3QgYWJvdXQgdGhpcy5cbiAgICpcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnQgVGhlIGV2ZW50IHRoYXQgZmlyZWQuXG4gICAqIEBwcml2YXRlXG4gICAqIEBzdXBwcmVzcyB7bWlzc2luZ1Byb3BlcnRpZXN9XG4gICAqL1xuTWF0ZXJpYWxTbGlkZXIucHJvdG90eXBlLm9uQ29udGFpbmVyTW91c2VEb3duXyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIC8vIElmIHRoaXMgY2xpY2sgaXMgbm90IG9uIHRoZSBwYXJlbnQgZWxlbWVudCAoYnV0IHJhdGhlciBzb21lIGNoaWxkKVxuICAgIC8vIGlnbm9yZS4gSXQgbWF5IHN0aWxsIGJ1YmJsZSB1cC5cbiAgICBpZiAoZXZlbnQudGFyZ2V0ICE9PSB0aGlzLmVsZW1lbnRfLnBhcmVudEVsZW1lbnQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBEaXNjYXJkIHRoZSBvcmlnaW5hbCBldmVudCBhbmQgY3JlYXRlIGEgbmV3IGV2ZW50IHRoYXRcbiAgICAvLyBpcyBvbiB0aGUgc2xpZGVyIGVsZW1lbnQuXG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB2YXIgbmV3RXZlbnQgPSBuZXcgTW91c2VFdmVudCgnbW91c2Vkb3duJywge1xuICAgICAgICB0YXJnZXQ6IGV2ZW50LnRhcmdldCxcbiAgICAgICAgYnV0dG9uczogZXZlbnQuYnV0dG9ucyxcbiAgICAgICAgY2xpZW50WDogZXZlbnQuY2xpZW50WCxcbiAgICAgICAgY2xpZW50WTogdGhpcy5lbGVtZW50Xy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS55XG4gICAgfSk7XG4gICAgdGhpcy5lbGVtZW50Xy5kaXNwYXRjaEV2ZW50KG5ld0V2ZW50KTtcbn07XG4vKipcbiAgICogSGFuZGxlIHVwZGF0aW5nIG9mIHZhbHVlcy5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFNsaWRlci5wcm90b3R5cGUudXBkYXRlVmFsdWVTdHlsZXNfID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIENhbGN1bGF0ZSBhbmQgYXBwbHkgcGVyY2VudGFnZXMgdG8gZGl2IHN0cnVjdHVyZSBiZWhpbmQgc2xpZGVyLlxuICAgIHZhciBmcmFjdGlvbiA9ICh0aGlzLmVsZW1lbnRfLnZhbHVlIC0gdGhpcy5lbGVtZW50Xy5taW4pIC8gKHRoaXMuZWxlbWVudF8ubWF4IC0gdGhpcy5lbGVtZW50Xy5taW4pO1xuICAgIGlmIChmcmFjdGlvbiA9PT0gMCkge1xuICAgICAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JU19MT1dFU1RfVkFMVUUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LnJlbW92ZSh0aGlzLkNzc0NsYXNzZXNfLklTX0xPV0VTVF9WQUxVRSk7XG4gICAgfVxuICAgIGlmICghdGhpcy5pc0lFXykge1xuICAgICAgICB0aGlzLmJhY2tncm91bmRMb3dlcl8uc3R5bGUuZmxleCA9IGZyYWN0aW9uO1xuICAgICAgICB0aGlzLmJhY2tncm91bmRMb3dlcl8uc3R5bGUud2Via2l0RmxleCA9IGZyYWN0aW9uO1xuICAgICAgICB0aGlzLmJhY2tncm91bmRVcHBlcl8uc3R5bGUuZmxleCA9IDEgLSBmcmFjdGlvbjtcbiAgICAgICAgdGhpcy5iYWNrZ3JvdW5kVXBwZXJfLnN0eWxlLndlYmtpdEZsZXggPSAxIC0gZnJhY3Rpb247XG4gICAgfVxufTtcbi8vIFB1YmxpYyBtZXRob2RzLlxuLyoqXG4gICAqIERpc2FibGUgc2xpZGVyLlxuICAgKlxuICAgKiBAcHVibGljXG4gICAqL1xuTWF0ZXJpYWxTbGlkZXIucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5lbGVtZW50Xy5kaXNhYmxlZCA9IHRydWU7XG59O1xuTWF0ZXJpYWxTbGlkZXIucHJvdG90eXBlWydkaXNhYmxlJ10gPSBNYXRlcmlhbFNsaWRlci5wcm90b3R5cGUuZGlzYWJsZTtcbi8qKlxuICAgKiBFbmFibGUgc2xpZGVyLlxuICAgKlxuICAgKiBAcHVibGljXG4gICAqL1xuTWF0ZXJpYWxTbGlkZXIucHJvdG90eXBlLmVuYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmVsZW1lbnRfLmRpc2FibGVkID0gZmFsc2U7XG59O1xuTWF0ZXJpYWxTbGlkZXIucHJvdG90eXBlWydlbmFibGUnXSA9IE1hdGVyaWFsU2xpZGVyLnByb3RvdHlwZS5lbmFibGU7XG4vKipcbiAgICogVXBkYXRlIHNsaWRlciB2YWx1ZS5cbiAgICpcbiAgICogQHBhcmFtIHtudW1iZXJ9IHZhbHVlIFRoZSB2YWx1ZSB0byB3aGljaCB0byBzZXQgdGhlIGNvbnRyb2wgKG9wdGlvbmFsKS5cbiAgICogQHB1YmxpY1xuICAgKi9cbk1hdGVyaWFsU2xpZGVyLnByb3RvdHlwZS5jaGFuZ2UgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0aGlzLmVsZW1lbnRfLnZhbHVlID0gdmFsdWU7XG4gICAgfVxuICAgIHRoaXMudXBkYXRlVmFsdWVTdHlsZXNfKCk7XG59O1xuTWF0ZXJpYWxTbGlkZXIucHJvdG90eXBlWydjaGFuZ2UnXSA9IE1hdGVyaWFsU2xpZGVyLnByb3RvdHlwZS5jaGFuZ2U7XG4vKipcbiAgICogSW5pdGlhbGl6ZSBlbGVtZW50LlxuICAgKi9cbk1hdGVyaWFsU2xpZGVyLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmVsZW1lbnRfKSB7XG4gICAgICAgIGlmICh0aGlzLmlzSUVfKSB7XG4gICAgICAgICAgICAvLyBTaW5jZSB3ZSBuZWVkIHRvIHNwZWNpZnkgYSB2ZXJ5IGxhcmdlIGhlaWdodCBpbiBJRSBkdWUgdG9cbiAgICAgICAgICAgIC8vIGltcGxlbWVudGF0aW9uIGxpbWl0YXRpb25zLCB3ZSBhZGQgYSBwYXJlbnQgaGVyZSB0aGF0IHRyaW1zIGl0IGRvd24gdG9cbiAgICAgICAgICAgIC8vIGEgcmVhc29uYWJsZSBzaXplLlxuICAgICAgICAgICAgdmFyIGNvbnRhaW5lcklFID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICBjb250YWluZXJJRS5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uSUVfQ09OVEFJTkVSKTtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudF8ucGFyZW50RWxlbWVudC5pbnNlcnRCZWZvcmUoY29udGFpbmVySUUsIHRoaXMuZWxlbWVudF8pO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50Xy5wYXJlbnRFbGVtZW50LnJlbW92ZUNoaWxkKHRoaXMuZWxlbWVudF8pO1xuICAgICAgICAgICAgY29udGFpbmVySUUuYXBwZW5kQ2hpbGQodGhpcy5lbGVtZW50Xyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGb3Igbm9uLUlFIGJyb3dzZXJzLCB3ZSBuZWVkIGEgZGl2IHN0cnVjdHVyZSB0aGF0IHNpdHMgYmVoaW5kIHRoZVxuICAgICAgICAgICAgLy8gc2xpZGVyIGFuZCBhbGxvd3MgdXMgdG8gc3R5bGUgdGhlIGxlZnQgYW5kIHJpZ2h0IHNpZGVzIG9mIGl0IHdpdGhcbiAgICAgICAgICAgIC8vIGRpZmZlcmVudCBjb2xvcnMuXG4gICAgICAgICAgICB2YXIgY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICBjb250YWluZXIuY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLlNMSURFUl9DT05UQUlORVIpO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50Xy5wYXJlbnRFbGVtZW50Lmluc2VydEJlZm9yZShjb250YWluZXIsIHRoaXMuZWxlbWVudF8pO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50Xy5wYXJlbnRFbGVtZW50LnJlbW92ZUNoaWxkKHRoaXMuZWxlbWVudF8pO1xuICAgICAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHRoaXMuZWxlbWVudF8pO1xuICAgICAgICAgICAgdmFyIGJhY2tncm91bmRGbGV4ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICBiYWNrZ3JvdW5kRmxleC5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uQkFDS0dST1VORF9GTEVYKTtcbiAgICAgICAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChiYWNrZ3JvdW5kRmxleCk7XG4gICAgICAgICAgICB0aGlzLmJhY2tncm91bmRMb3dlcl8gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgIHRoaXMuYmFja2dyb3VuZExvd2VyXy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uQkFDS0dST1VORF9MT1dFUik7XG4gICAgICAgICAgICBiYWNrZ3JvdW5kRmxleC5hcHBlbmRDaGlsZCh0aGlzLmJhY2tncm91bmRMb3dlcl8pO1xuICAgICAgICAgICAgdGhpcy5iYWNrZ3JvdW5kVXBwZXJfID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICB0aGlzLmJhY2tncm91bmRVcHBlcl8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLkJBQ0tHUk9VTkRfVVBQRVIpO1xuICAgICAgICAgICAgYmFja2dyb3VuZEZsZXguYXBwZW5kQ2hpbGQodGhpcy5iYWNrZ3JvdW5kVXBwZXJfKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmJvdW5kSW5wdXRIYW5kbGVyID0gdGhpcy5vbklucHV0Xy5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmJvdW5kQ2hhbmdlSGFuZGxlciA9IHRoaXMub25DaGFuZ2VfLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuYm91bmRNb3VzZVVwSGFuZGxlciA9IHRoaXMub25Nb3VzZVVwXy5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmJvdW5kQ29udGFpbmVyTW91c2VEb3duSGFuZGxlciA9IHRoaXMub25Db250YWluZXJNb3VzZURvd25fLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCB0aGlzLmJvdW5kSW5wdXRIYW5kbGVyKTtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCB0aGlzLmJvdW5kQ2hhbmdlSGFuZGxlcik7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuYm91bmRNb3VzZVVwSGFuZGxlcik7XG4gICAgICAgIHRoaXMuZWxlbWVudF8ucGFyZW50RWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCB0aGlzLmJvdW5kQ29udGFpbmVyTW91c2VEb3duSGFuZGxlcik7XG4gICAgICAgIHRoaXMudXBkYXRlVmFsdWVTdHlsZXNfKCk7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLklTX1VQR1JBREVEKTtcbiAgICB9XG59O1xuLy8gVGhlIGNvbXBvbmVudCByZWdpc3RlcnMgaXRzZWxmLiBJdCBjYW4gYXNzdW1lIGNvbXBvbmVudEhhbmRsZXIgaXMgYXZhaWxhYmxlXG4vLyBpbiB0aGUgZ2xvYmFsIHNjb3BlLlxuY29tcG9uZW50SGFuZGxlci5yZWdpc3Rlcih7XG4gICAgY29uc3RydWN0b3I6IE1hdGVyaWFsU2xpZGVyLFxuICAgIGNsYXNzQXNTdHJpbmc6ICdNYXRlcmlhbFNsaWRlcicsXG4gICAgY3NzQ2xhc3M6ICdtZGwtanMtc2xpZGVyJyxcbiAgICB3aWRnZXQ6IHRydWVcbn0pO1xuLyoqXG4gKiBDb3B5cmlnaHQgMjAxNSBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICAgKiBDbGFzcyBjb25zdHJ1Y3RvciBmb3IgU25hY2tiYXIgTURMIGNvbXBvbmVudC5cbiAgICogSW1wbGVtZW50cyBNREwgY29tcG9uZW50IGRlc2lnbiBwYXR0ZXJuIGRlZmluZWQgYXQ6XG4gICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9qYXNvbm1heWVzL21kbC1jb21wb25lbnQtZGVzaWduLXBhdHRlcm5cbiAgICpcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsZW1lbnQgVGhlIGVsZW1lbnQgdGhhdCB3aWxsIGJlIHVwZ3JhZGVkLlxuICAgKi9cbnZhciBNYXRlcmlhbFNuYWNrYmFyID0gZnVuY3Rpb24gTWF0ZXJpYWxTbmFja2JhcihlbGVtZW50KSB7XG4gICAgdGhpcy5lbGVtZW50XyA9IGVsZW1lbnQ7XG4gICAgdGhpcy50ZXh0RWxlbWVudF8gPSB0aGlzLmVsZW1lbnRfLnF1ZXJ5U2VsZWN0b3IoJy4nICsgdGhpcy5jc3NDbGFzc2VzXy5NRVNTQUdFKTtcbiAgICB0aGlzLmFjdGlvbkVsZW1lbnRfID0gdGhpcy5lbGVtZW50Xy5xdWVyeVNlbGVjdG9yKCcuJyArIHRoaXMuY3NzQ2xhc3Nlc18uQUNUSU9OKTtcbiAgICBpZiAoIXRoaXMudGV4dEVsZW1lbnRfKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVGhlcmUgbXVzdCBiZSBhIG1lc3NhZ2UgZWxlbWVudCBmb3IgYSBzbmFja2Jhci4nKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmFjdGlvbkVsZW1lbnRfKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVGhlcmUgbXVzdCBiZSBhbiBhY3Rpb24gZWxlbWVudCBmb3IgYSBzbmFja2Jhci4nKTtcbiAgICB9XG4gICAgdGhpcy5hY3RpdmUgPSBmYWxzZTtcbiAgICB0aGlzLmFjdGlvbkhhbmRsZXJfID0gdW5kZWZpbmVkO1xuICAgIHRoaXMubWVzc2FnZV8gPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5hY3Rpb25UZXh0XyA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLnF1ZXVlZE5vdGlmaWNhdGlvbnNfID0gW107XG4gICAgdGhpcy5zZXRBY3Rpb25IaWRkZW5fKHRydWUpO1xufTtcbndpbmRvd1snTWF0ZXJpYWxTbmFja2JhciddID0gTWF0ZXJpYWxTbmFja2Jhcjtcbi8qKlxuICAgKiBTdG9yZSBjb25zdGFudHMgaW4gb25lIHBsYWNlIHNvIHRoZXkgY2FuIGJlIHVwZGF0ZWQgZWFzaWx5LlxuICAgKlxuICAgKiBAZW51bSB7c3RyaW5nIHwgbnVtYmVyfVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsU25hY2tiYXIucHJvdG90eXBlLkNvbnN0YW50XyA9IHtcbiAgICAvLyBUaGUgZHVyYXRpb24gb2YgdGhlIHNuYWNrYmFyIHNob3cvaGlkZSBhbmltYXRpb24sIGluIG1zLlxuICAgIEFOSU1BVElPTl9MRU5HVEg6IDI1MFxufTtcbi8qKlxuICAgKiBTdG9yZSBzdHJpbmdzIGZvciBjbGFzcyBuYW1lcyBkZWZpbmVkIGJ5IHRoaXMgY29tcG9uZW50IHRoYXQgYXJlIHVzZWQgaW5cbiAgICogSmF2YVNjcmlwdC4gVGhpcyBhbGxvd3MgdXMgdG8gc2ltcGx5IGNoYW5nZSBpdCBpbiBvbmUgcGxhY2Ugc2hvdWxkIHdlXG4gICAqIGRlY2lkZSB0byBtb2RpZnkgYXQgYSBsYXRlciBkYXRlLlxuICAgKlxuICAgKiBAZW51bSB7c3RyaW5nfVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsU25hY2tiYXIucHJvdG90eXBlLmNzc0NsYXNzZXNfID0ge1xuICAgIFNOQUNLQkFSOiAnbWRsLXNuYWNrYmFyJyxcbiAgICBNRVNTQUdFOiAnbWRsLXNuYWNrYmFyX190ZXh0JyxcbiAgICBBQ1RJT046ICdtZGwtc25hY2tiYXJfX2FjdGlvbicsXG4gICAgQUNUSVZFOiAnbWRsLXNuYWNrYmFyLS1hY3RpdmUnXG59O1xuLyoqXG4gICAqIERpc3BsYXkgdGhlIHNuYWNrYmFyLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsU25hY2tiYXIucHJvdG90eXBlLmRpc3BsYXlTbmFja2Jhcl8gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5lbGVtZW50Xy5zZXRBdHRyaWJ1dGUoJ2FyaWEtaGlkZGVuJywgJ3RydWUnKTtcbiAgICBpZiAodGhpcy5hY3Rpb25IYW5kbGVyXykge1xuICAgICAgICB0aGlzLmFjdGlvbkVsZW1lbnRfLnRleHRDb250ZW50ID0gdGhpcy5hY3Rpb25UZXh0XztcbiAgICAgICAgdGhpcy5hY3Rpb25FbGVtZW50Xy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuYWN0aW9uSGFuZGxlcl8pO1xuICAgICAgICB0aGlzLnNldEFjdGlvbkhpZGRlbl8oZmFsc2UpO1xuICAgIH1cbiAgICB0aGlzLnRleHRFbGVtZW50Xy50ZXh0Q29udGVudCA9IHRoaXMubWVzc2FnZV87XG4gICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuYWRkKHRoaXMuY3NzQ2xhc3Nlc18uQUNUSVZFKTtcbiAgICB0aGlzLmVsZW1lbnRfLnNldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nLCAnZmFsc2UnKTtcbiAgICBzZXRUaW1lb3V0KHRoaXMuY2xlYW51cF8uYmluZCh0aGlzKSwgdGhpcy50aW1lb3V0Xyk7XG59O1xuLyoqXG4gICAqIFNob3cgdGhlIHNuYWNrYmFyLlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgZGF0YSBmb3IgdGhlIG5vdGlmaWNhdGlvbi5cbiAgICogQHB1YmxpY1xuICAgKi9cbk1hdGVyaWFsU25hY2tiYXIucHJvdG90eXBlLnNob3dTbmFja2JhciA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgaWYgKGRhdGEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1BsZWFzZSBwcm92aWRlIGEgZGF0YSBvYmplY3Qgd2l0aCBhdCBsZWFzdCBhIG1lc3NhZ2UgdG8gZGlzcGxheS4nKTtcbiAgICB9XG4gICAgaWYgKGRhdGFbJ21lc3NhZ2UnXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUGxlYXNlIHByb3ZpZGUgYSBtZXNzYWdlIHRvIGJlIGRpc3BsYXllZC4nKTtcbiAgICB9XG4gICAgaWYgKGRhdGFbJ2FjdGlvbkhhbmRsZXInXSAmJiAhZGF0YVsnYWN0aW9uVGV4dCddKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUGxlYXNlIHByb3ZpZGUgYWN0aW9uIHRleHQgd2l0aCB0aGUgaGFuZGxlci4nKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuYWN0aXZlKSB7XG4gICAgICAgIHRoaXMucXVldWVkTm90aWZpY2F0aW9uc18ucHVzaChkYXRhKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmFjdGl2ZSA9IHRydWU7XG4gICAgICAgIHRoaXMubWVzc2FnZV8gPSBkYXRhWydtZXNzYWdlJ107XG4gICAgICAgIGlmIChkYXRhWyd0aW1lb3V0J10pIHtcbiAgICAgICAgICAgIHRoaXMudGltZW91dF8gPSBkYXRhWyd0aW1lb3V0J107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVvdXRfID0gMjc1MDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YVsnYWN0aW9uSGFuZGxlciddKSB7XG4gICAgICAgICAgICB0aGlzLmFjdGlvbkhhbmRsZXJfID0gZGF0YVsnYWN0aW9uSGFuZGxlciddO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhWydhY3Rpb25UZXh0J10pIHtcbiAgICAgICAgICAgIHRoaXMuYWN0aW9uVGV4dF8gPSBkYXRhWydhY3Rpb25UZXh0J107XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5kaXNwbGF5U25hY2tiYXJfKCk7XG4gICAgfVxufTtcbk1hdGVyaWFsU25hY2tiYXIucHJvdG90eXBlWydzaG93U25hY2tiYXInXSA9IE1hdGVyaWFsU25hY2tiYXIucHJvdG90eXBlLnNob3dTbmFja2Jhcjtcbi8qKlxuICAgKiBDaGVjayBpZiB0aGUgcXVldWUgaGFzIGl0ZW1zIHdpdGhpbiBpdC5cbiAgICogSWYgaXQgZG9lcywgZGlzcGxheSB0aGUgbmV4dCBlbnRyeS5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFNuYWNrYmFyLnByb3RvdHlwZS5jaGVja1F1ZXVlXyA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5xdWV1ZWROb3RpZmljYXRpb25zXy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHRoaXMuc2hvd1NuYWNrYmFyKHRoaXMucXVldWVkTm90aWZpY2F0aW9uc18uc2hpZnQoKSk7XG4gICAgfVxufTtcbi8qKlxuICAgKiBDbGVhbnVwIHRoZSBzbmFja2JhciBldmVudCBsaXN0ZW5lcnMgYW5kIGFjY2Vzc2libGl0eSBhdHRyaWJ1dGVzLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsU25hY2tiYXIucHJvdG90eXBlLmNsZWFudXBfID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LnJlbW92ZSh0aGlzLmNzc0NsYXNzZXNfLkFDVElWRSk7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uc2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicsICd0cnVlJyk7XG4gICAgICAgIHRoaXMudGV4dEVsZW1lbnRfLnRleHRDb250ZW50ID0gJyc7XG4gICAgICAgIGlmICghQm9vbGVhbih0aGlzLmFjdGlvbkVsZW1lbnRfLmdldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nKSkpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0QWN0aW9uSGlkZGVuXyh0cnVlKTtcbiAgICAgICAgICAgIHRoaXMuYWN0aW9uRWxlbWVudF8udGV4dENvbnRlbnQgPSAnJztcbiAgICAgICAgICAgIHRoaXMuYWN0aW9uRWxlbWVudF8ucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmFjdGlvbkhhbmRsZXJfKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmFjdGlvbkhhbmRsZXJfID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLm1lc3NhZ2VfID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLmFjdGlvblRleHRfID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLmFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLmNoZWNrUXVldWVfKCk7XG4gICAgfS5iaW5kKHRoaXMpLCB0aGlzLkNvbnN0YW50Xy5BTklNQVRJT05fTEVOR1RIKTtcbn07XG4vKipcbiAgICogU2V0IHRoZSBhY3Rpb24gaGFuZGxlciBoaWRkZW4gc3RhdGUuXG4gICAqXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gdmFsdWVcbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFNuYWNrYmFyLnByb3RvdHlwZS5zZXRBY3Rpb25IaWRkZW5fID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuYWN0aW9uRWxlbWVudF8uc2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicsICd0cnVlJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5hY3Rpb25FbGVtZW50Xy5yZW1vdmVBdHRyaWJ1dGUoJ2FyaWEtaGlkZGVuJyk7XG4gICAgfVxufTtcbi8vIFRoZSBjb21wb25lbnQgcmVnaXN0ZXJzIGl0c2VsZi4gSXQgY2FuIGFzc3VtZSBjb21wb25lbnRIYW5kbGVyIGlzIGF2YWlsYWJsZVxuLy8gaW4gdGhlIGdsb2JhbCBzY29wZS5cbmNvbXBvbmVudEhhbmRsZXIucmVnaXN0ZXIoe1xuICAgIGNvbnN0cnVjdG9yOiBNYXRlcmlhbFNuYWNrYmFyLFxuICAgIGNsYXNzQXNTdHJpbmc6ICdNYXRlcmlhbFNuYWNrYmFyJyxcbiAgICBjc3NDbGFzczogJ21kbC1qcy1zbmFja2JhcicsXG4gICAgd2lkZ2V0OiB0cnVlXG59KTtcbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE1IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gICAqIENsYXNzIGNvbnN0cnVjdG9yIGZvciBTcGlubmVyIE1ETCBjb21wb25lbnQuXG4gICAqIEltcGxlbWVudHMgTURMIGNvbXBvbmVudCBkZXNpZ24gcGF0dGVybiBkZWZpbmVkIGF0OlxuICAgKiBodHRwczovL2dpdGh1Yi5jb20vamFzb25tYXllcy9tZGwtY29tcG9uZW50LWRlc2lnbi1wYXR0ZXJuXG4gICAqXG4gICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsZW1lbnQgVGhlIGVsZW1lbnQgdGhhdCB3aWxsIGJlIHVwZ3JhZGVkLlxuICAgKiBAY29uc3RydWN0b3JcbiAgICovXG52YXIgTWF0ZXJpYWxTcGlubmVyID0gZnVuY3Rpb24gTWF0ZXJpYWxTcGlubmVyKGVsZW1lbnQpIHtcbiAgICB0aGlzLmVsZW1lbnRfID0gZWxlbWVudDtcbiAgICAvLyBJbml0aWFsaXplIGluc3RhbmNlLlxuICAgIHRoaXMuaW5pdCgpO1xufTtcbndpbmRvd1snTWF0ZXJpYWxTcGlubmVyJ10gPSBNYXRlcmlhbFNwaW5uZXI7XG4vKipcbiAgICogU3RvcmUgY29uc3RhbnRzIGluIG9uZSBwbGFjZSBzbyB0aGV5IGNhbiBiZSB1cGRhdGVkIGVhc2lseS5cbiAgICpcbiAgICogQGVudW0ge3N0cmluZyB8IG51bWJlcn1cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFNwaW5uZXIucHJvdG90eXBlLkNvbnN0YW50XyA9IHsgTURMX1NQSU5ORVJfTEFZRVJfQ09VTlQ6IDQgfTtcbi8qKlxuICAgKiBTdG9yZSBzdHJpbmdzIGZvciBjbGFzcyBuYW1lcyBkZWZpbmVkIGJ5IHRoaXMgY29tcG9uZW50IHRoYXQgYXJlIHVzZWQgaW5cbiAgICogSmF2YVNjcmlwdC4gVGhpcyBhbGxvd3MgdXMgdG8gc2ltcGx5IGNoYW5nZSBpdCBpbiBvbmUgcGxhY2Ugc2hvdWxkIHdlXG4gICAqIGRlY2lkZSB0byBtb2RpZnkgYXQgYSBsYXRlciBkYXRlLlxuICAgKlxuICAgKiBAZW51bSB7c3RyaW5nfVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsU3Bpbm5lci5wcm90b3R5cGUuQ3NzQ2xhc3Nlc18gPSB7XG4gICAgTURMX1NQSU5ORVJfTEFZRVI6ICdtZGwtc3Bpbm5lcl9fbGF5ZXInLFxuICAgIE1ETF9TUElOTkVSX0NJUkNMRV9DTElQUEVSOiAnbWRsLXNwaW5uZXJfX2NpcmNsZS1jbGlwcGVyJyxcbiAgICBNRExfU1BJTk5FUl9DSVJDTEU6ICdtZGwtc3Bpbm5lcl9fY2lyY2xlJyxcbiAgICBNRExfU1BJTk5FUl9HQVBfUEFUQ0g6ICdtZGwtc3Bpbm5lcl9fZ2FwLXBhdGNoJyxcbiAgICBNRExfU1BJTk5FUl9MRUZUOiAnbWRsLXNwaW5uZXJfX2xlZnQnLFxuICAgIE1ETF9TUElOTkVSX1JJR0hUOiAnbWRsLXNwaW5uZXJfX3JpZ2h0J1xufTtcbi8qKlxuICAgKiBBdXhpbGlhcnkgbWV0aG9kIHRvIGNyZWF0ZSBhIHNwaW5uZXIgbGF5ZXIuXG4gICAqXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBpbmRleCBJbmRleCBvZiB0aGUgbGF5ZXIgdG8gYmUgY3JlYXRlZC5cbiAgICogQHB1YmxpY1xuICAgKi9cbk1hdGVyaWFsU3Bpbm5lci5wcm90b3R5cGUuY3JlYXRlTGF5ZXIgPSBmdW5jdGlvbiAoaW5kZXgpIHtcbiAgICB2YXIgbGF5ZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBsYXllci5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uTURMX1NQSU5ORVJfTEFZRVIpO1xuICAgIGxheWVyLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5NRExfU1BJTk5FUl9MQVlFUiArICctJyArIGluZGV4KTtcbiAgICB2YXIgbGVmdENsaXBwZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBsZWZ0Q2xpcHBlci5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uTURMX1NQSU5ORVJfQ0lSQ0xFX0NMSVBQRVIpO1xuICAgIGxlZnRDbGlwcGVyLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5NRExfU1BJTk5FUl9MRUZUKTtcbiAgICB2YXIgZ2FwUGF0Y2ggPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBnYXBQYXRjaC5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uTURMX1NQSU5ORVJfR0FQX1BBVENIKTtcbiAgICB2YXIgcmlnaHRDbGlwcGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgcmlnaHRDbGlwcGVyLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5NRExfU1BJTk5FUl9DSVJDTEVfQ0xJUFBFUik7XG4gICAgcmlnaHRDbGlwcGVyLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5NRExfU1BJTk5FUl9SSUdIVCk7XG4gICAgdmFyIGNpcmNsZU93bmVycyA9IFtcbiAgICAgICAgbGVmdENsaXBwZXIsXG4gICAgICAgIGdhcFBhdGNoLFxuICAgICAgICByaWdodENsaXBwZXJcbiAgICBdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2lyY2xlT3duZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjaXJjbGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgY2lyY2xlLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5NRExfU1BJTk5FUl9DSVJDTEUpO1xuICAgICAgICBjaXJjbGVPd25lcnNbaV0uYXBwZW5kQ2hpbGQoY2lyY2xlKTtcbiAgICB9XG4gICAgbGF5ZXIuYXBwZW5kQ2hpbGQobGVmdENsaXBwZXIpO1xuICAgIGxheWVyLmFwcGVuZENoaWxkKGdhcFBhdGNoKTtcbiAgICBsYXllci5hcHBlbmRDaGlsZChyaWdodENsaXBwZXIpO1xuICAgIHRoaXMuZWxlbWVudF8uYXBwZW5kQ2hpbGQobGF5ZXIpO1xufTtcbk1hdGVyaWFsU3Bpbm5lci5wcm90b3R5cGVbJ2NyZWF0ZUxheWVyJ10gPSBNYXRlcmlhbFNwaW5uZXIucHJvdG90eXBlLmNyZWF0ZUxheWVyO1xuLyoqXG4gICAqIFN0b3BzIHRoZSBzcGlubmVyIGFuaW1hdGlvbi5cbiAgICogUHVibGljIG1ldGhvZCBmb3IgdXNlcnMgd2hvIG5lZWQgdG8gc3RvcCB0aGUgc3Bpbm5lciBmb3IgYW55IHJlYXNvbi5cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKi9cbk1hdGVyaWFsU3Bpbm5lci5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLWFjdGl2ZScpO1xufTtcbk1hdGVyaWFsU3Bpbm5lci5wcm90b3R5cGVbJ3N0b3AnXSA9IE1hdGVyaWFsU3Bpbm5lci5wcm90b3R5cGUuc3RvcDtcbi8qKlxuICAgKiBTdGFydHMgdGhlIHNwaW5uZXIgYW5pbWF0aW9uLlxuICAgKiBQdWJsaWMgbWV0aG9kIGZvciB1c2VycyB3aG8gbmVlZCB0byBtYW51YWxseSBzdGFydCB0aGUgc3Bpbm5lciBmb3IgYW55IHJlYXNvblxuICAgKiAoaW5zdGVhZCBvZiBqdXN0IGFkZGluZyB0aGUgJ2lzLWFjdGl2ZScgY2xhc3MgdG8gdGhlaXIgbWFya3VwKS5cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKi9cbk1hdGVyaWFsU3Bpbm5lci5wcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuYWRkKCdpcy1hY3RpdmUnKTtcbn07XG5NYXRlcmlhbFNwaW5uZXIucHJvdG90eXBlWydzdGFydCddID0gTWF0ZXJpYWxTcGlubmVyLnByb3RvdHlwZS5zdGFydDtcbi8qKlxuICAgKiBJbml0aWFsaXplIGVsZW1lbnQuXG4gICAqL1xuTWF0ZXJpYWxTcGlubmVyLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmVsZW1lbnRfKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDw9IHRoaXMuQ29uc3RhbnRfLk1ETF9TUElOTkVSX0xBWUVSX0NPVU5UOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuY3JlYXRlTGF5ZXIoaSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuYWRkKCdpcy11cGdyYWRlZCcpO1xuICAgIH1cbn07XG4vLyBUaGUgY29tcG9uZW50IHJlZ2lzdGVycyBpdHNlbGYuIEl0IGNhbiBhc3N1bWUgY29tcG9uZW50SGFuZGxlciBpcyBhdmFpbGFibGVcbi8vIGluIHRoZSBnbG9iYWwgc2NvcGUuXG5jb21wb25lbnRIYW5kbGVyLnJlZ2lzdGVyKHtcbiAgICBjb25zdHJ1Y3RvcjogTWF0ZXJpYWxTcGlubmVyLFxuICAgIGNsYXNzQXNTdHJpbmc6ICdNYXRlcmlhbFNwaW5uZXInLFxuICAgIGNzc0NsYXNzOiAnbWRsLWpzLXNwaW5uZXInLFxuICAgIHdpZGdldDogdHJ1ZVxufSk7XG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNSBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICAgKiBDbGFzcyBjb25zdHJ1Y3RvciBmb3IgQ2hlY2tib3ggTURMIGNvbXBvbmVudC5cbiAgICogSW1wbGVtZW50cyBNREwgY29tcG9uZW50IGRlc2lnbiBwYXR0ZXJuIGRlZmluZWQgYXQ6XG4gICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9qYXNvbm1heWVzL21kbC1jb21wb25lbnQtZGVzaWduLXBhdHRlcm5cbiAgICpcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsZW1lbnQgVGhlIGVsZW1lbnQgdGhhdCB3aWxsIGJlIHVwZ3JhZGVkLlxuICAgKi9cbnZhciBNYXRlcmlhbFN3aXRjaCA9IGZ1bmN0aW9uIE1hdGVyaWFsU3dpdGNoKGVsZW1lbnQpIHtcbiAgICB0aGlzLmVsZW1lbnRfID0gZWxlbWVudDtcbiAgICAvLyBJbml0aWFsaXplIGluc3RhbmNlLlxuICAgIHRoaXMuaW5pdCgpO1xufTtcbndpbmRvd1snTWF0ZXJpYWxTd2l0Y2gnXSA9IE1hdGVyaWFsU3dpdGNoO1xuLyoqXG4gICAqIFN0b3JlIGNvbnN0YW50cyBpbiBvbmUgcGxhY2Ugc28gdGhleSBjYW4gYmUgdXBkYXRlZCBlYXNpbHkuXG4gICAqXG4gICAqIEBlbnVtIHtzdHJpbmcgfCBudW1iZXJ9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxTd2l0Y2gucHJvdG90eXBlLkNvbnN0YW50XyA9IHsgVElOWV9USU1FT1VUOiAwLjAwMSB9O1xuLyoqXG4gICAqIFN0b3JlIHN0cmluZ3MgZm9yIGNsYXNzIG5hbWVzIGRlZmluZWQgYnkgdGhpcyBjb21wb25lbnQgdGhhdCBhcmUgdXNlZCBpblxuICAgKiBKYXZhU2NyaXB0LiBUaGlzIGFsbG93cyB1cyB0byBzaW1wbHkgY2hhbmdlIGl0IGluIG9uZSBwbGFjZSBzaG91bGQgd2VcbiAgICogZGVjaWRlIHRvIG1vZGlmeSBhdCBhIGxhdGVyIGRhdGUuXG4gICAqXG4gICAqIEBlbnVtIHtzdHJpbmd9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxTd2l0Y2gucHJvdG90eXBlLkNzc0NsYXNzZXNfID0ge1xuICAgIElOUFVUOiAnbWRsLXN3aXRjaF9faW5wdXQnLFxuICAgIFRSQUNLOiAnbWRsLXN3aXRjaF9fdHJhY2snLFxuICAgIFRIVU1COiAnbWRsLXN3aXRjaF9fdGh1bWInLFxuICAgIEZPQ1VTX0hFTFBFUjogJ21kbC1zd2l0Y2hfX2ZvY3VzLWhlbHBlcicsXG4gICAgUklQUExFX0VGRkVDVDogJ21kbC1qcy1yaXBwbGUtZWZmZWN0JyxcbiAgICBSSVBQTEVfSUdOT1JFX0VWRU5UUzogJ21kbC1qcy1yaXBwbGUtZWZmZWN0LS1pZ25vcmUtZXZlbnRzJyxcbiAgICBSSVBQTEVfQ09OVEFJTkVSOiAnbWRsLXN3aXRjaF9fcmlwcGxlLWNvbnRhaW5lcicsXG4gICAgUklQUExFX0NFTlRFUjogJ21kbC1yaXBwbGUtLWNlbnRlcicsXG4gICAgUklQUExFOiAnbWRsLXJpcHBsZScsXG4gICAgSVNfRk9DVVNFRDogJ2lzLWZvY3VzZWQnLFxuICAgIElTX0RJU0FCTEVEOiAnaXMtZGlzYWJsZWQnLFxuICAgIElTX0NIRUNLRUQ6ICdpcy1jaGVja2VkJ1xufTtcbi8qKlxuICAgKiBIYW5kbGUgY2hhbmdlIG9mIHN0YXRlLlxuICAgKlxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudCBUaGUgZXZlbnQgdGhhdCBmaXJlZC5cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFN3aXRjaC5wcm90b3R5cGUub25DaGFuZ2VfID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdGhpcy51cGRhdGVDbGFzc2VzXygpO1xufTtcbi8qKlxuICAgKiBIYW5kbGUgZm9jdXMgb2YgZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnQgVGhlIGV2ZW50IHRoYXQgZmlyZWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxTd2l0Y2gucHJvdG90eXBlLm9uRm9jdXNfID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfRk9DVVNFRCk7XG59O1xuLyoqXG4gICAqIEhhbmRsZSBsb3N0IGZvY3VzIG9mIGVsZW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IFRoZSBldmVudCB0aGF0IGZpcmVkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsU3dpdGNoLnByb3RvdHlwZS5vbkJsdXJfID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfRk9DVVNFRCk7XG59O1xuLyoqXG4gICAqIEhhbmRsZSBtb3VzZXVwLlxuICAgKlxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudCBUaGUgZXZlbnQgdGhhdCBmaXJlZC5cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFN3aXRjaC5wcm90b3R5cGUub25Nb3VzZVVwXyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHRoaXMuYmx1cl8oKTtcbn07XG4vKipcbiAgICogSGFuZGxlIGNsYXNzIHVwZGF0ZXMuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxTd2l0Y2gucHJvdG90eXBlLnVwZGF0ZUNsYXNzZXNfID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuY2hlY2tEaXNhYmxlZCgpO1xuICAgIHRoaXMuY2hlY2tUb2dnbGVTdGF0ZSgpO1xufTtcbi8qKlxuICAgKiBBZGQgYmx1ci5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFN3aXRjaC5wcm90b3R5cGUuYmx1cl8gPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gVE9ETzogZmlndXJlIG91dCB3aHkgdGhlcmUncyBhIGZvY3VzIGV2ZW50IGJlaW5nIGZpcmVkIGFmdGVyIG91ciBibHVyLFxuICAgIC8vIHNvIHRoYXQgd2UgY2FuIGF2b2lkIHRoaXMgaGFjay5cbiAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuaW5wdXRFbGVtZW50Xy5ibHVyKCk7XG4gICAgfS5iaW5kKHRoaXMpLCB0aGlzLkNvbnN0YW50Xy5USU5ZX1RJTUVPVVQpO1xufTtcbi8vIFB1YmxpYyBtZXRob2RzLlxuLyoqXG4gICAqIENoZWNrIHRoZSBjb21wb25lbnRzIGRpc2FibGVkIHN0YXRlLlxuICAgKlxuICAgKiBAcHVibGljXG4gICAqL1xuTWF0ZXJpYWxTd2l0Y2gucHJvdG90eXBlLmNoZWNrRGlzYWJsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuaW5wdXRFbGVtZW50Xy5kaXNhYmxlZCkge1xuICAgICAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JU19ESVNBQkxFRCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfRElTQUJMRUQpO1xuICAgIH1cbn07XG5NYXRlcmlhbFN3aXRjaC5wcm90b3R5cGVbJ2NoZWNrRGlzYWJsZWQnXSA9IE1hdGVyaWFsU3dpdGNoLnByb3RvdHlwZS5jaGVja0Rpc2FibGVkO1xuLyoqXG4gICAqIENoZWNrIHRoZSBjb21wb25lbnRzIHRvZ2dsZWQgc3RhdGUuXG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICovXG5NYXRlcmlhbFN3aXRjaC5wcm90b3R5cGUuY2hlY2tUb2dnbGVTdGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5pbnB1dEVsZW1lbnRfLmNoZWNrZWQpIHtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfQ0hFQ0tFRCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfQ0hFQ0tFRCk7XG4gICAgfVxufTtcbk1hdGVyaWFsU3dpdGNoLnByb3RvdHlwZVsnY2hlY2tUb2dnbGVTdGF0ZSddID0gTWF0ZXJpYWxTd2l0Y2gucHJvdG90eXBlLmNoZWNrVG9nZ2xlU3RhdGU7XG4vKipcbiAgICogRGlzYWJsZSBzd2l0Y2guXG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICovXG5NYXRlcmlhbFN3aXRjaC5wcm90b3R5cGUuZGlzYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmlucHV0RWxlbWVudF8uZGlzYWJsZWQgPSB0cnVlO1xuICAgIHRoaXMudXBkYXRlQ2xhc3Nlc18oKTtcbn07XG5NYXRlcmlhbFN3aXRjaC5wcm90b3R5cGVbJ2Rpc2FibGUnXSA9IE1hdGVyaWFsU3dpdGNoLnByb3RvdHlwZS5kaXNhYmxlO1xuLyoqXG4gICAqIEVuYWJsZSBzd2l0Y2guXG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICovXG5NYXRlcmlhbFN3aXRjaC5wcm90b3R5cGUuZW5hYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuaW5wdXRFbGVtZW50Xy5kaXNhYmxlZCA9IGZhbHNlO1xuICAgIHRoaXMudXBkYXRlQ2xhc3Nlc18oKTtcbn07XG5NYXRlcmlhbFN3aXRjaC5wcm90b3R5cGVbJ2VuYWJsZSddID0gTWF0ZXJpYWxTd2l0Y2gucHJvdG90eXBlLmVuYWJsZTtcbi8qKlxuICAgKiBBY3RpdmF0ZSBzd2l0Y2guXG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICovXG5NYXRlcmlhbFN3aXRjaC5wcm90b3R5cGUub24gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5pbnB1dEVsZW1lbnRfLmNoZWNrZWQgPSB0cnVlO1xuICAgIHRoaXMudXBkYXRlQ2xhc3Nlc18oKTtcbn07XG5NYXRlcmlhbFN3aXRjaC5wcm90b3R5cGVbJ29uJ10gPSBNYXRlcmlhbFN3aXRjaC5wcm90b3R5cGUub247XG4vKipcbiAgICogRGVhY3RpdmF0ZSBzd2l0Y2guXG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICovXG5NYXRlcmlhbFN3aXRjaC5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuaW5wdXRFbGVtZW50Xy5jaGVja2VkID0gZmFsc2U7XG4gICAgdGhpcy51cGRhdGVDbGFzc2VzXygpO1xufTtcbk1hdGVyaWFsU3dpdGNoLnByb3RvdHlwZVsnb2ZmJ10gPSBNYXRlcmlhbFN3aXRjaC5wcm90b3R5cGUub2ZmO1xuLyoqXG4gICAqIEluaXRpYWxpemUgZWxlbWVudC5cbiAgICovXG5NYXRlcmlhbFN3aXRjaC5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5lbGVtZW50Xykge1xuICAgICAgICB0aGlzLmlucHV0RWxlbWVudF8gPSB0aGlzLmVsZW1lbnRfLnF1ZXJ5U2VsZWN0b3IoJy4nICsgdGhpcy5Dc3NDbGFzc2VzXy5JTlBVVCk7XG4gICAgICAgIHZhciB0cmFjayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICB0cmFjay5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uVFJBQ0spO1xuICAgICAgICB2YXIgdGh1bWIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgdGh1bWIuY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLlRIVU1CKTtcbiAgICAgICAgdmFyIGZvY3VzSGVscGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICBmb2N1c0hlbHBlci5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uRk9DVVNfSEVMUEVSKTtcbiAgICAgICAgdGh1bWIuYXBwZW5kQ2hpbGQoZm9jdXNIZWxwZXIpO1xuICAgICAgICB0aGlzLmVsZW1lbnRfLmFwcGVuZENoaWxkKHRyYWNrKTtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5hcHBlbmRDaGlsZCh0aHVtYik7XG4gICAgICAgIHRoaXMuYm91bmRNb3VzZVVwSGFuZGxlciA9IHRoaXMub25Nb3VzZVVwXy5iaW5kKHRoaXMpO1xuICAgICAgICBpZiAodGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5SSVBQTEVfRUZGRUNUKSkge1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uUklQUExFX0lHTk9SRV9FVkVOVFMpO1xuICAgICAgICAgICAgdGhpcy5yaXBwbGVDb250YWluZXJFbGVtZW50XyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgIHRoaXMucmlwcGxlQ29udGFpbmVyRWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLlJJUFBMRV9DT05UQUlORVIpO1xuICAgICAgICAgICAgdGhpcy5yaXBwbGVDb250YWluZXJFbGVtZW50Xy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uUklQUExFX0VGRkVDVCk7XG4gICAgICAgICAgICB0aGlzLnJpcHBsZUNvbnRhaW5lckVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5SSVBQTEVfQ0VOVEVSKTtcbiAgICAgICAgICAgIHRoaXMucmlwcGxlQ29udGFpbmVyRWxlbWVudF8uYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuYm91bmRNb3VzZVVwSGFuZGxlcik7XG4gICAgICAgICAgICB2YXIgcmlwcGxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgcmlwcGxlLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5SSVBQTEUpO1xuICAgICAgICAgICAgdGhpcy5yaXBwbGVDb250YWluZXJFbGVtZW50Xy5hcHBlbmRDaGlsZChyaXBwbGUpO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50Xy5hcHBlbmRDaGlsZCh0aGlzLnJpcHBsZUNvbnRhaW5lckVsZW1lbnRfKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmJvdW5kQ2hhbmdlSGFuZGxlciA9IHRoaXMub25DaGFuZ2VfLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuYm91bmRGb2N1c0hhbmRsZXIgPSB0aGlzLm9uRm9jdXNfLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuYm91bmRCbHVySGFuZGxlciA9IHRoaXMub25CbHVyXy5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmlucHV0RWxlbWVudF8uYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgdGhpcy5ib3VuZENoYW5nZUhhbmRsZXIpO1xuICAgICAgICB0aGlzLmlucHV0RWxlbWVudF8uYWRkRXZlbnRMaXN0ZW5lcignZm9jdXMnLCB0aGlzLmJvdW5kRm9jdXNIYW5kbGVyKTtcbiAgICAgICAgdGhpcy5pbnB1dEVsZW1lbnRfLmFkZEV2ZW50TGlzdGVuZXIoJ2JsdXInLCB0aGlzLmJvdW5kQmx1ckhhbmRsZXIpO1xuICAgICAgICB0aGlzLmVsZW1lbnRfLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCB0aGlzLmJvdW5kTW91c2VVcEhhbmRsZXIpO1xuICAgICAgICB0aGlzLnVwZGF0ZUNsYXNzZXNfKCk7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmFkZCgnaXMtdXBncmFkZWQnKTtcbiAgICB9XG59O1xuLy8gVGhlIGNvbXBvbmVudCByZWdpc3RlcnMgaXRzZWxmLiBJdCBjYW4gYXNzdW1lIGNvbXBvbmVudEhhbmRsZXIgaXMgYXZhaWxhYmxlXG4vLyBpbiB0aGUgZ2xvYmFsIHNjb3BlLlxuY29tcG9uZW50SGFuZGxlci5yZWdpc3Rlcih7XG4gICAgY29uc3RydWN0b3I6IE1hdGVyaWFsU3dpdGNoLFxuICAgIGNsYXNzQXNTdHJpbmc6ICdNYXRlcmlhbFN3aXRjaCcsXG4gICAgY3NzQ2xhc3M6ICdtZGwtanMtc3dpdGNoJyxcbiAgICB3aWRnZXQ6IHRydWVcbn0pO1xuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTUgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAgICogQ2xhc3MgY29uc3RydWN0b3IgZm9yIFRhYnMgTURMIGNvbXBvbmVudC5cbiAgICogSW1wbGVtZW50cyBNREwgY29tcG9uZW50IGRlc2lnbiBwYXR0ZXJuIGRlZmluZWQgYXQ6XG4gICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9qYXNvbm1heWVzL21kbC1jb21wb25lbnQtZGVzaWduLXBhdHRlcm5cbiAgICpcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7RWxlbWVudH0gZWxlbWVudCBUaGUgZWxlbWVudCB0aGF0IHdpbGwgYmUgdXBncmFkZWQuXG4gICAqL1xudmFyIE1hdGVyaWFsVGFicyA9IGZ1bmN0aW9uIE1hdGVyaWFsVGFicyhlbGVtZW50KSB7XG4gICAgLy8gU3RvcmVzIHRoZSBIVE1MIGVsZW1lbnQuXG4gICAgdGhpcy5lbGVtZW50XyA9IGVsZW1lbnQ7XG4gICAgLy8gSW5pdGlhbGl6ZSBpbnN0YW5jZS5cbiAgICB0aGlzLmluaXQoKTtcbn07XG53aW5kb3dbJ01hdGVyaWFsVGFicyddID0gTWF0ZXJpYWxUYWJzO1xuLyoqXG4gICAqIFN0b3JlIGNvbnN0YW50cyBpbiBvbmUgcGxhY2Ugc28gdGhleSBjYW4gYmUgdXBkYXRlZCBlYXNpbHkuXG4gICAqXG4gICAqIEBlbnVtIHtzdHJpbmd9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxUYWJzLnByb3RvdHlwZS5Db25zdGFudF8gPSB7fTtcbi8qKlxuICAgKiBTdG9yZSBzdHJpbmdzIGZvciBjbGFzcyBuYW1lcyBkZWZpbmVkIGJ5IHRoaXMgY29tcG9uZW50IHRoYXQgYXJlIHVzZWQgaW5cbiAgICogSmF2YVNjcmlwdC4gVGhpcyBhbGxvd3MgdXMgdG8gc2ltcGx5IGNoYW5nZSBpdCBpbiBvbmUgcGxhY2Ugc2hvdWxkIHdlXG4gICAqIGRlY2lkZSB0byBtb2RpZnkgYXQgYSBsYXRlciBkYXRlLlxuICAgKlxuICAgKiBAZW51bSB7c3RyaW5nfVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsVGFicy5wcm90b3R5cGUuQ3NzQ2xhc3Nlc18gPSB7XG4gICAgVEFCX0NMQVNTOiAnbWRsLXRhYnNfX3RhYicsXG4gICAgUEFORUxfQ0xBU1M6ICdtZGwtdGFic19fcGFuZWwnLFxuICAgIEFDVElWRV9DTEFTUzogJ2lzLWFjdGl2ZScsXG4gICAgVVBHUkFERURfQ0xBU1M6ICdpcy11cGdyYWRlZCcsXG4gICAgTURMX0pTX1JJUFBMRV9FRkZFQ1Q6ICdtZGwtanMtcmlwcGxlLWVmZmVjdCcsXG4gICAgTURMX1JJUFBMRV9DT05UQUlORVI6ICdtZGwtdGFic19fcmlwcGxlLWNvbnRhaW5lcicsXG4gICAgTURMX1JJUFBMRTogJ21kbC1yaXBwbGUnLFxuICAgIE1ETF9KU19SSVBQTEVfRUZGRUNUX0lHTk9SRV9FVkVOVFM6ICdtZGwtanMtcmlwcGxlLWVmZmVjdC0taWdub3JlLWV2ZW50cydcbn07XG4vKipcbiAgICogSGFuZGxlIGNsaWNrcyB0byBhIHRhYnMgY29tcG9uZW50XG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxUYWJzLnByb3RvdHlwZS5pbml0VGFic18gPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uTURMX0pTX1JJUFBMRV9FRkZFQ1QpKSB7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLk1ETF9KU19SSVBQTEVfRUZGRUNUX0lHTk9SRV9FVkVOVFMpO1xuICAgIH1cbiAgICAvLyBTZWxlY3QgZWxlbWVudCB0YWJzLCBkb2N1bWVudCBwYW5lbHNcbiAgICB0aGlzLnRhYnNfID0gdGhpcy5lbGVtZW50Xy5xdWVyeVNlbGVjdG9yQWxsKCcuJyArIHRoaXMuQ3NzQ2xhc3Nlc18uVEFCX0NMQVNTKTtcbiAgICB0aGlzLnBhbmVsc18gPSB0aGlzLmVsZW1lbnRfLnF1ZXJ5U2VsZWN0b3JBbGwoJy4nICsgdGhpcy5Dc3NDbGFzc2VzXy5QQU5FTF9DTEFTUyk7XG4gICAgLy8gQ3JlYXRlIG5ldyB0YWJzIGZvciBlYWNoIHRhYiBlbGVtZW50XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnRhYnNfLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG5ldyBNYXRlcmlhbFRhYih0aGlzLnRhYnNfW2ldLCB0aGlzKTtcbiAgICB9XG4gICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uVVBHUkFERURfQ0xBU1MpO1xufTtcbi8qKlxuICAgKiBSZXNldCB0YWIgc3RhdGUsIGRyb3BwaW5nIGFjdGl2ZSBjbGFzc2VzXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxUYWJzLnByb3RvdHlwZS5yZXNldFRhYlN0YXRlXyA9IGZ1bmN0aW9uICgpIHtcbiAgICBmb3IgKHZhciBrID0gMDsgayA8IHRoaXMudGFic18ubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgdGhpcy50YWJzX1trXS5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuQ3NzQ2xhc3Nlc18uQUNUSVZFX0NMQVNTKTtcbiAgICB9XG59O1xuLyoqXG4gICAqIFJlc2V0IHBhbmVsIHN0YXRlLCBkcm9waW5nIGFjdGl2ZSBjbGFzc2VzXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxUYWJzLnByb3RvdHlwZS5yZXNldFBhbmVsU3RhdGVfID0gZnVuY3Rpb24gKCkge1xuICAgIGZvciAodmFyIGogPSAwOyBqIDwgdGhpcy5wYW5lbHNfLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHRoaXMucGFuZWxzX1tqXS5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuQ3NzQ2xhc3Nlc18uQUNUSVZFX0NMQVNTKTtcbiAgICB9XG59O1xuLyoqXG4gICAqIEluaXRpYWxpemUgZWxlbWVudC5cbiAgICovXG5NYXRlcmlhbFRhYnMucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuZWxlbWVudF8pIHtcbiAgICAgICAgdGhpcy5pbml0VGFic18oKTtcbiAgICB9XG59O1xuLyoqXG4gICAqIENvbnN0cnVjdG9yIGZvciBhbiBpbmRpdmlkdWFsIHRhYi5cbiAgICpcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7RWxlbWVudH0gdGFiIFRoZSBIVE1MIGVsZW1lbnQgZm9yIHRoZSB0YWIuXG4gICAqIEBwYXJhbSB7TWF0ZXJpYWxUYWJzfSBjdHggVGhlIE1hdGVyaWFsVGFicyBvYmplY3QgdGhhdCBvd25zIHRoZSB0YWIuXG4gICAqL1xuZnVuY3Rpb24gTWF0ZXJpYWxUYWIodGFiLCBjdHgpIHtcbiAgICBpZiAodGFiKSB7XG4gICAgICAgIGlmIChjdHguZWxlbWVudF8uY2xhc3NMaXN0LmNvbnRhaW5zKGN0eC5Dc3NDbGFzc2VzXy5NRExfSlNfUklQUExFX0VGRkVDVCkpIHtcbiAgICAgICAgICAgIHZhciByaXBwbGVDb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICByaXBwbGVDb250YWluZXIuY2xhc3NMaXN0LmFkZChjdHguQ3NzQ2xhc3Nlc18uTURMX1JJUFBMRV9DT05UQUlORVIpO1xuICAgICAgICAgICAgcmlwcGxlQ29udGFpbmVyLmNsYXNzTGlzdC5hZGQoY3R4LkNzc0NsYXNzZXNfLk1ETF9KU19SSVBQTEVfRUZGRUNUKTtcbiAgICAgICAgICAgIHZhciByaXBwbGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICByaXBwbGUuY2xhc3NMaXN0LmFkZChjdHguQ3NzQ2xhc3Nlc18uTURMX1JJUFBMRSk7XG4gICAgICAgICAgICByaXBwbGVDb250YWluZXIuYXBwZW5kQ2hpbGQocmlwcGxlKTtcbiAgICAgICAgICAgIHRhYi5hcHBlbmRDaGlsZChyaXBwbGVDb250YWluZXIpO1xuICAgICAgICB9XG4gICAgICAgIHRhYi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB2YXIgaHJlZiA9IHRhYi5ocmVmLnNwbGl0KCcjJylbMV07XG4gICAgICAgICAgICB2YXIgcGFuZWwgPSBjdHguZWxlbWVudF8ucXVlcnlTZWxlY3RvcignIycgKyBocmVmKTtcbiAgICAgICAgICAgIGN0eC5yZXNldFRhYlN0YXRlXygpO1xuICAgICAgICAgICAgY3R4LnJlc2V0UGFuZWxTdGF0ZV8oKTtcbiAgICAgICAgICAgIHRhYi5jbGFzc0xpc3QuYWRkKGN0eC5Dc3NDbGFzc2VzXy5BQ1RJVkVfQ0xBU1MpO1xuICAgICAgICAgICAgcGFuZWwuY2xhc3NMaXN0LmFkZChjdHguQ3NzQ2xhc3Nlc18uQUNUSVZFX0NMQVNTKTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuLy8gVGhlIGNvbXBvbmVudCByZWdpc3RlcnMgaXRzZWxmLiBJdCBjYW4gYXNzdW1lIGNvbXBvbmVudEhhbmRsZXIgaXMgYXZhaWxhYmxlXG4vLyBpbiB0aGUgZ2xvYmFsIHNjb3BlLlxuY29tcG9uZW50SGFuZGxlci5yZWdpc3Rlcih7XG4gICAgY29uc3RydWN0b3I6IE1hdGVyaWFsVGFicyxcbiAgICBjbGFzc0FzU3RyaW5nOiAnTWF0ZXJpYWxUYWJzJyxcbiAgICBjc3NDbGFzczogJ21kbC1qcy10YWJzJ1xufSk7XG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNSBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICAgKiBDbGFzcyBjb25zdHJ1Y3RvciBmb3IgVGV4dGZpZWxkIE1ETCBjb21wb25lbnQuXG4gICAqIEltcGxlbWVudHMgTURMIGNvbXBvbmVudCBkZXNpZ24gcGF0dGVybiBkZWZpbmVkIGF0OlxuICAgKiBodHRwczovL2dpdGh1Yi5jb20vamFzb25tYXllcy9tZGwtY29tcG9uZW50LWRlc2lnbi1wYXR0ZXJuXG4gICAqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbGVtZW50IFRoZSBlbGVtZW50IHRoYXQgd2lsbCBiZSB1cGdyYWRlZC5cbiAgICovXG52YXIgTWF0ZXJpYWxUZXh0ZmllbGQgPSBmdW5jdGlvbiBNYXRlcmlhbFRleHRmaWVsZChlbGVtZW50KSB7XG4gICAgdGhpcy5lbGVtZW50XyA9IGVsZW1lbnQ7XG4gICAgdGhpcy5tYXhSb3dzID0gdGhpcy5Db25zdGFudF8uTk9fTUFYX1JPV1M7XG4gICAgLy8gSW5pdGlhbGl6ZSBpbnN0YW5jZS5cbiAgICB0aGlzLmluaXQoKTtcbn07XG53aW5kb3dbJ01hdGVyaWFsVGV4dGZpZWxkJ10gPSBNYXRlcmlhbFRleHRmaWVsZDtcbi8qKlxuICAgKiBTdG9yZSBjb25zdGFudHMgaW4gb25lIHBsYWNlIHNvIHRoZXkgY2FuIGJlIHVwZGF0ZWQgZWFzaWx5LlxuICAgKlxuICAgKiBAZW51bSB7c3RyaW5nIHwgbnVtYmVyfVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsVGV4dGZpZWxkLnByb3RvdHlwZS5Db25zdGFudF8gPSB7XG4gICAgTk9fTUFYX1JPV1M6IC0xLFxuICAgIE1BWF9ST1dTX0FUVFJJQlVURTogJ21heHJvd3MnXG59O1xuLyoqXG4gICAqIFN0b3JlIHN0cmluZ3MgZm9yIGNsYXNzIG5hbWVzIGRlZmluZWQgYnkgdGhpcyBjb21wb25lbnQgdGhhdCBhcmUgdXNlZCBpblxuICAgKiBKYXZhU2NyaXB0LiBUaGlzIGFsbG93cyB1cyB0byBzaW1wbHkgY2hhbmdlIGl0IGluIG9uZSBwbGFjZSBzaG91bGQgd2VcbiAgICogZGVjaWRlIHRvIG1vZGlmeSBhdCBhIGxhdGVyIGRhdGUuXG4gICAqXG4gICAqIEBlbnVtIHtzdHJpbmd9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxUZXh0ZmllbGQucHJvdG90eXBlLkNzc0NsYXNzZXNfID0ge1xuICAgIExBQkVMOiAnbWRsLXRleHRmaWVsZF9fbGFiZWwnLFxuICAgIElOUFVUOiAnbWRsLXRleHRmaWVsZF9faW5wdXQnLFxuICAgIElTX0RJUlRZOiAnaXMtZGlydHknLFxuICAgIElTX0ZPQ1VTRUQ6ICdpcy1mb2N1c2VkJyxcbiAgICBJU19ESVNBQkxFRDogJ2lzLWRpc2FibGVkJyxcbiAgICBJU19JTlZBTElEOiAnaXMtaW52YWxpZCcsXG4gICAgSVNfVVBHUkFERUQ6ICdpcy11cGdyYWRlZCcsXG4gICAgSEFTX1BMQUNFSE9MREVSOiAnaGFzLXBsYWNlaG9sZGVyJ1xufTtcbi8qKlxuICAgKiBIYW5kbGUgaW5wdXQgYmVpbmcgZW50ZXJlZC5cbiAgICpcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnQgVGhlIGV2ZW50IHRoYXQgZmlyZWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxUZXh0ZmllbGQucHJvdG90eXBlLm9uS2V5RG93bl8gPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB2YXIgY3VycmVudFJvd0NvdW50ID0gZXZlbnQudGFyZ2V0LnZhbHVlLnNwbGl0KCdcXG4nKS5sZW5ndGg7XG4gICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDEzKSB7XG4gICAgICAgIGlmIChjdXJyZW50Um93Q291bnQgPj0gdGhpcy5tYXhSb3dzKSB7XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9XG4gICAgfVxufTtcbi8qKlxuICAgKiBIYW5kbGUgZm9jdXMuXG4gICAqXG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IFRoZSBldmVudCB0aGF0IGZpcmVkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsVGV4dGZpZWxkLnByb3RvdHlwZS5vbkZvY3VzXyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLklTX0ZPQ1VTRUQpO1xufTtcbi8qKlxuICAgKiBIYW5kbGUgbG9zdCBmb2N1cy5cbiAgICpcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnQgVGhlIGV2ZW50IHRoYXQgZmlyZWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxUZXh0ZmllbGQucHJvdG90eXBlLm9uQmx1cl8gPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5yZW1vdmUodGhpcy5Dc3NDbGFzc2VzXy5JU19GT0NVU0VEKTtcbn07XG4vKipcbiAgICogSGFuZGxlIHJlc2V0IGV2ZW50IGZyb20gb3V0IHNpZGUuXG4gICAqXG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IFRoZSBldmVudCB0aGF0IGZpcmVkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsVGV4dGZpZWxkLnByb3RvdHlwZS5vblJlc2V0XyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHRoaXMudXBkYXRlQ2xhc3Nlc18oKTtcbn07XG4vKipcbiAgICogSGFuZGxlIGNsYXNzIHVwZGF0ZXMuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxUZXh0ZmllbGQucHJvdG90eXBlLnVwZGF0ZUNsYXNzZXNfID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuY2hlY2tEaXNhYmxlZCgpO1xuICAgIHRoaXMuY2hlY2tWYWxpZGl0eSgpO1xuICAgIHRoaXMuY2hlY2tEaXJ0eSgpO1xuICAgIHRoaXMuY2hlY2tGb2N1cygpO1xufTtcbi8vIFB1YmxpYyBtZXRob2RzLlxuLyoqXG4gICAqIENoZWNrIHRoZSBkaXNhYmxlZCBzdGF0ZSBhbmQgdXBkYXRlIGZpZWxkIGFjY29yZGluZ2x5LlxuICAgKlxuICAgKiBAcHVibGljXG4gICAqL1xuTWF0ZXJpYWxUZXh0ZmllbGQucHJvdG90eXBlLmNoZWNrRGlzYWJsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuaW5wdXRfLmRpc2FibGVkKSB7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLklTX0RJU0FCTEVEKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5yZW1vdmUodGhpcy5Dc3NDbGFzc2VzXy5JU19ESVNBQkxFRCk7XG4gICAgfVxufTtcbk1hdGVyaWFsVGV4dGZpZWxkLnByb3RvdHlwZVsnY2hlY2tEaXNhYmxlZCddID0gTWF0ZXJpYWxUZXh0ZmllbGQucHJvdG90eXBlLmNoZWNrRGlzYWJsZWQ7XG4vKipcbiAgKiBDaGVjayB0aGUgZm9jdXMgc3RhdGUgYW5kIHVwZGF0ZSBmaWVsZCBhY2NvcmRpbmdseS5cbiAgKlxuICAqIEBwdWJsaWNcbiAgKi9cbk1hdGVyaWFsVGV4dGZpZWxkLnByb3RvdHlwZS5jaGVja0ZvY3VzID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChCb29sZWFuKHRoaXMuZWxlbWVudF8ucXVlcnlTZWxlY3RvcignOmZvY3VzJykpKSB7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLklTX0ZPQ1VTRUQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LnJlbW92ZSh0aGlzLkNzc0NsYXNzZXNfLklTX0ZPQ1VTRUQpO1xuICAgIH1cbn07XG5NYXRlcmlhbFRleHRmaWVsZC5wcm90b3R5cGVbJ2NoZWNrRm9jdXMnXSA9IE1hdGVyaWFsVGV4dGZpZWxkLnByb3RvdHlwZS5jaGVja0ZvY3VzO1xuLyoqXG4gICAqIENoZWNrIHRoZSB2YWxpZGl0eSBzdGF0ZSBhbmQgdXBkYXRlIGZpZWxkIGFjY29yZGluZ2x5LlxuICAgKlxuICAgKiBAcHVibGljXG4gICAqL1xuTWF0ZXJpYWxUZXh0ZmllbGQucHJvdG90eXBlLmNoZWNrVmFsaWRpdHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuaW5wdXRfLnZhbGlkaXR5KSB7XG4gICAgICAgIGlmICh0aGlzLmlucHV0Xy52YWxpZGl0eS52YWxpZCkge1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfSU5WQUxJRCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JU19JTlZBTElEKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5NYXRlcmlhbFRleHRmaWVsZC5wcm90b3R5cGVbJ2NoZWNrVmFsaWRpdHknXSA9IE1hdGVyaWFsVGV4dGZpZWxkLnByb3RvdHlwZS5jaGVja1ZhbGlkaXR5O1xuLyoqXG4gICAqIENoZWNrIHRoZSBkaXJ0eSBzdGF0ZSBhbmQgdXBkYXRlIGZpZWxkIGFjY29yZGluZ2x5LlxuICAgKlxuICAgKiBAcHVibGljXG4gICAqL1xuTWF0ZXJpYWxUZXh0ZmllbGQucHJvdG90eXBlLmNoZWNrRGlydHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuaW5wdXRfLnZhbHVlICYmIHRoaXMuaW5wdXRfLnZhbHVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfRElSVFkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LnJlbW92ZSh0aGlzLkNzc0NsYXNzZXNfLklTX0RJUlRZKTtcbiAgICB9XG59O1xuTWF0ZXJpYWxUZXh0ZmllbGQucHJvdG90eXBlWydjaGVja0RpcnR5J10gPSBNYXRlcmlhbFRleHRmaWVsZC5wcm90b3R5cGUuY2hlY2tEaXJ0eTtcbi8qKlxuICAgKiBEaXNhYmxlIHRleHQgZmllbGQuXG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICovXG5NYXRlcmlhbFRleHRmaWVsZC5wcm90b3R5cGUuZGlzYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmlucHV0Xy5kaXNhYmxlZCA9IHRydWU7XG4gICAgdGhpcy51cGRhdGVDbGFzc2VzXygpO1xufTtcbk1hdGVyaWFsVGV4dGZpZWxkLnByb3RvdHlwZVsnZGlzYWJsZSddID0gTWF0ZXJpYWxUZXh0ZmllbGQucHJvdG90eXBlLmRpc2FibGU7XG4vKipcbiAgICogRW5hYmxlIHRleHQgZmllbGQuXG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICovXG5NYXRlcmlhbFRleHRmaWVsZC5wcm90b3R5cGUuZW5hYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuaW5wdXRfLmRpc2FibGVkID0gZmFsc2U7XG4gICAgdGhpcy51cGRhdGVDbGFzc2VzXygpO1xufTtcbk1hdGVyaWFsVGV4dGZpZWxkLnByb3RvdHlwZVsnZW5hYmxlJ10gPSBNYXRlcmlhbFRleHRmaWVsZC5wcm90b3R5cGUuZW5hYmxlO1xuLyoqXG4gICAqIFVwZGF0ZSB0ZXh0IGZpZWxkIHZhbHVlLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgVGhlIHZhbHVlIHRvIHdoaWNoIHRvIHNldCB0aGUgY29udHJvbCAob3B0aW9uYWwpLlxuICAgKiBAcHVibGljXG4gICAqL1xuTWF0ZXJpYWxUZXh0ZmllbGQucHJvdG90eXBlLmNoYW5nZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHRoaXMuaW5wdXRfLnZhbHVlID0gdmFsdWUgfHwgJyc7XG4gICAgdGhpcy51cGRhdGVDbGFzc2VzXygpO1xufTtcbk1hdGVyaWFsVGV4dGZpZWxkLnByb3RvdHlwZVsnY2hhbmdlJ10gPSBNYXRlcmlhbFRleHRmaWVsZC5wcm90b3R5cGUuY2hhbmdlO1xuLyoqXG4gICAqIEluaXRpYWxpemUgZWxlbWVudC5cbiAgICovXG5NYXRlcmlhbFRleHRmaWVsZC5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5lbGVtZW50Xykge1xuICAgICAgICB0aGlzLmxhYmVsXyA9IHRoaXMuZWxlbWVudF8ucXVlcnlTZWxlY3RvcignLicgKyB0aGlzLkNzc0NsYXNzZXNfLkxBQkVMKTtcbiAgICAgICAgdGhpcy5pbnB1dF8gPSB0aGlzLmVsZW1lbnRfLnF1ZXJ5U2VsZWN0b3IoJy4nICsgdGhpcy5Dc3NDbGFzc2VzXy5JTlBVVCk7XG4gICAgICAgIGlmICh0aGlzLmlucHV0Xykge1xuICAgICAgICAgICAgaWYgKHRoaXMuaW5wdXRfLmhhc0F0dHJpYnV0ZSh0aGlzLkNvbnN0YW50Xy5NQVhfUk9XU19BVFRSSUJVVEUpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tYXhSb3dzID0gcGFyc2VJbnQodGhpcy5pbnB1dF8uZ2V0QXR0cmlidXRlKHRoaXMuQ29uc3RhbnRfLk1BWF9ST1dTX0FUVFJJQlVURSksIDEwKTtcbiAgICAgICAgICAgICAgICBpZiAoaXNOYU4odGhpcy5tYXhSb3dzKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm1heFJvd3MgPSB0aGlzLkNvbnN0YW50Xy5OT19NQVhfUk9XUztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5pbnB1dF8uaGFzQXR0cmlidXRlKCdwbGFjZWhvbGRlcicpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uSEFTX1BMQUNFSE9MREVSKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuYm91bmRVcGRhdGVDbGFzc2VzSGFuZGxlciA9IHRoaXMudXBkYXRlQ2xhc3Nlc18uYmluZCh0aGlzKTtcbiAgICAgICAgICAgIHRoaXMuYm91bmRGb2N1c0hhbmRsZXIgPSB0aGlzLm9uRm9jdXNfLmJpbmQodGhpcyk7XG4gICAgICAgICAgICB0aGlzLmJvdW5kQmx1ckhhbmRsZXIgPSB0aGlzLm9uQmx1cl8uYmluZCh0aGlzKTtcbiAgICAgICAgICAgIHRoaXMuYm91bmRSZXNldEhhbmRsZXIgPSB0aGlzLm9uUmVzZXRfLmJpbmQodGhpcyk7XG4gICAgICAgICAgICB0aGlzLmlucHV0Xy5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsIHRoaXMuYm91bmRVcGRhdGVDbGFzc2VzSGFuZGxlcik7XG4gICAgICAgICAgICB0aGlzLmlucHV0Xy5hZGRFdmVudExpc3RlbmVyKCdmb2N1cycsIHRoaXMuYm91bmRGb2N1c0hhbmRsZXIpO1xuICAgICAgICAgICAgdGhpcy5pbnB1dF8uYWRkRXZlbnRMaXN0ZW5lcignYmx1cicsIHRoaXMuYm91bmRCbHVySGFuZGxlcik7XG4gICAgICAgICAgICB0aGlzLmlucHV0Xy5hZGRFdmVudExpc3RlbmVyKCdyZXNldCcsIHRoaXMuYm91bmRSZXNldEhhbmRsZXIpO1xuICAgICAgICAgICAgaWYgKHRoaXMubWF4Um93cyAhPT0gdGhpcy5Db25zdGFudF8uTk9fTUFYX1JPV1MpIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiBUaGlzIHNob3VsZCBoYW5kbGUgcGFzdGluZyBtdWx0aSBsaW5lIHRleHQuXG4gICAgICAgICAgICAgICAgLy8gQ3VycmVudGx5IGRvZXNuJ3QuXG4gICAgICAgICAgICAgICAgdGhpcy5ib3VuZEtleURvd25IYW5kbGVyID0gdGhpcy5vbktleURvd25fLmJpbmQodGhpcyk7XG4gICAgICAgICAgICAgICAgdGhpcy5pbnB1dF8uYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIHRoaXMuYm91bmRLZXlEb3duSGFuZGxlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgaW52YWxpZCA9IHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfSU5WQUxJRCk7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUNsYXNzZXNfKCk7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JU19VUEdSQURFRCk7XG4gICAgICAgICAgICBpZiAoaW52YWxpZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLklTX0lOVkFMSUQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuaW5wdXRfLmhhc0F0dHJpYnV0ZSgnYXV0b2ZvY3VzJykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmVsZW1lbnRfLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5jaGVja0ZvY3VzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuLy8gVGhlIGNvbXBvbmVudCByZWdpc3RlcnMgaXRzZWxmLiBJdCBjYW4gYXNzdW1lIGNvbXBvbmVudEhhbmRsZXIgaXMgYXZhaWxhYmxlXG4vLyBpbiB0aGUgZ2xvYmFsIHNjb3BlLlxuY29tcG9uZW50SGFuZGxlci5yZWdpc3Rlcih7XG4gICAgY29uc3RydWN0b3I6IE1hdGVyaWFsVGV4dGZpZWxkLFxuICAgIGNsYXNzQXNTdHJpbmc6ICdNYXRlcmlhbFRleHRmaWVsZCcsXG4gICAgY3NzQ2xhc3M6ICdtZGwtanMtdGV4dGZpZWxkJyxcbiAgICB3aWRnZXQ6IHRydWVcbn0pO1xuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTUgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAgICogQ2xhc3MgY29uc3RydWN0b3IgZm9yIFRvb2x0aXAgTURMIGNvbXBvbmVudC5cbiAgICogSW1wbGVtZW50cyBNREwgY29tcG9uZW50IGRlc2lnbiBwYXR0ZXJuIGRlZmluZWQgYXQ6XG4gICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9qYXNvbm1heWVzL21kbC1jb21wb25lbnQtZGVzaWduLXBhdHRlcm5cbiAgICpcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsZW1lbnQgVGhlIGVsZW1lbnQgdGhhdCB3aWxsIGJlIHVwZ3JhZGVkLlxuICAgKi9cbnZhciBNYXRlcmlhbFRvb2x0aXAgPSBmdW5jdGlvbiBNYXRlcmlhbFRvb2x0aXAoZWxlbWVudCkge1xuICAgIHRoaXMuZWxlbWVudF8gPSBlbGVtZW50O1xuICAgIC8vIEluaXRpYWxpemUgaW5zdGFuY2UuXG4gICAgdGhpcy5pbml0KCk7XG59O1xud2luZG93WydNYXRlcmlhbFRvb2x0aXAnXSA9IE1hdGVyaWFsVG9vbHRpcDtcbi8qKlxuICAgKiBTdG9yZSBjb25zdGFudHMgaW4gb25lIHBsYWNlIHNvIHRoZXkgY2FuIGJlIHVwZGF0ZWQgZWFzaWx5LlxuICAgKlxuICAgKiBAZW51bSB7c3RyaW5nIHwgbnVtYmVyfVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsVG9vbHRpcC5wcm90b3R5cGUuQ29uc3RhbnRfID0ge307XG4vKipcbiAgICogU3RvcmUgc3RyaW5ncyBmb3IgY2xhc3MgbmFtZXMgZGVmaW5lZCBieSB0aGlzIGNvbXBvbmVudCB0aGF0IGFyZSB1c2VkIGluXG4gICAqIEphdmFTY3JpcHQuIFRoaXMgYWxsb3dzIHVzIHRvIHNpbXBseSBjaGFuZ2UgaXQgaW4gb25lIHBsYWNlIHNob3VsZCB3ZVxuICAgKiBkZWNpZGUgdG8gbW9kaWZ5IGF0IGEgbGF0ZXIgZGF0ZS5cbiAgICpcbiAgICogQGVudW0ge3N0cmluZ31cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFRvb2x0aXAucHJvdG90eXBlLkNzc0NsYXNzZXNfID0ge1xuICAgIElTX0FDVElWRTogJ2lzLWFjdGl2ZScsXG4gICAgQk9UVE9NOiAnbWRsLXRvb2x0aXAtLWJvdHRvbScsXG4gICAgTEVGVDogJ21kbC10b29sdGlwLS1sZWZ0JyxcbiAgICBSSUdIVDogJ21kbC10b29sdGlwLS1yaWdodCcsXG4gICAgVE9QOiAnbWRsLXRvb2x0aXAtLXRvcCdcbn07XG4vKipcbiAgICogSGFuZGxlIG1vdXNlZW50ZXIgZm9yIHRvb2x0aXAuXG4gICAqXG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IFRoZSBldmVudCB0aGF0IGZpcmVkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsVG9vbHRpcC5wcm90b3R5cGUuaGFuZGxlTW91c2VFbnRlcl8gPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB2YXIgcHJvcHMgPSBldmVudC50YXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgdmFyIGxlZnQgPSBwcm9wcy5sZWZ0ICsgcHJvcHMud2lkdGggLyAyO1xuICAgIHZhciB0b3AgPSBwcm9wcy50b3AgKyBwcm9wcy5oZWlnaHQgLyAyO1xuICAgIHZhciBtYXJnaW5MZWZ0ID0gLTEgKiAodGhpcy5lbGVtZW50Xy5vZmZzZXRXaWR0aCAvIDIpO1xuICAgIHZhciBtYXJnaW5Ub3AgPSAtMSAqICh0aGlzLmVsZW1lbnRfLm9mZnNldEhlaWdodCAvIDIpO1xuICAgIGlmICh0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLkxFRlQpIHx8IHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uUklHSFQpKSB7XG4gICAgICAgIGxlZnQgPSBwcm9wcy53aWR0aCAvIDI7XG4gICAgICAgIGlmICh0b3AgKyBtYXJnaW5Ub3AgPCAwKSB7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRfLnN0eWxlLnRvcCA9IDA7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRfLnN0eWxlLm1hcmdpblRvcCA9IDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRfLnN0eWxlLnRvcCA9IHRvcCArICdweCc7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRfLnN0eWxlLm1hcmdpblRvcCA9IG1hcmdpblRvcCArICdweCc7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAobGVmdCArIG1hcmdpbkxlZnQgPCAwKSB7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRfLnN0eWxlLmxlZnQgPSAwO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50Xy5zdHlsZS5tYXJnaW5MZWZ0ID0gMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudF8uc3R5bGUubGVmdCA9IGxlZnQgKyAncHgnO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50Xy5zdHlsZS5tYXJnaW5MZWZ0ID0gbWFyZ2luTGVmdCArICdweCc7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uVE9QKSkge1xuICAgICAgICB0aGlzLmVsZW1lbnRfLnN0eWxlLnRvcCA9IHByb3BzLnRvcCAtIHRoaXMuZWxlbWVudF8ub2Zmc2V0SGVpZ2h0IC0gMTAgKyAncHgnO1xuICAgIH0gZWxzZSBpZiAodGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5SSUdIVCkpIHtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5zdHlsZS5sZWZ0ID0gcHJvcHMubGVmdCArIHByb3BzLndpZHRoICsgMTAgKyAncHgnO1xuICAgIH0gZWxzZSBpZiAodGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5MRUZUKSkge1xuICAgICAgICB0aGlzLmVsZW1lbnRfLnN0eWxlLmxlZnQgPSBwcm9wcy5sZWZ0IC0gdGhpcy5lbGVtZW50Xy5vZmZzZXRXaWR0aCAtIDEwICsgJ3B4JztcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmVsZW1lbnRfLnN0eWxlLnRvcCA9IHByb3BzLnRvcCArIHByb3BzLmhlaWdodCArIDEwICsgJ3B4JztcbiAgICB9XG4gICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfQUNUSVZFKTtcbn07XG4vKipcbiAgICogSGFuZGxlIG1vdXNlbGVhdmUgZm9yIHRvb2x0aXAuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxUb29sdGlwLnByb3RvdHlwZS5oYW5kbGVNb3VzZUxlYXZlXyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5yZW1vdmUodGhpcy5Dc3NDbGFzc2VzXy5JU19BQ1RJVkUpO1xufTtcbi8qKlxuICAgKiBJbml0aWFsaXplIGVsZW1lbnQuXG4gICAqL1xuTWF0ZXJpYWxUb29sdGlwLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmVsZW1lbnRfKSB7XG4gICAgICAgIHZhciBmb3JFbElkID0gdGhpcy5lbGVtZW50Xy5nZXRBdHRyaWJ1dGUoJ2ZvcicpO1xuICAgICAgICBpZiAoZm9yRWxJZCkge1xuICAgICAgICAgICAgdGhpcy5mb3JFbGVtZW50XyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGZvckVsSWQpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmZvckVsZW1lbnRfKSB7XG4gICAgICAgICAgICAvLyBJdCdzIGxlZnQgaGVyZSBiZWNhdXNlIGl0IHByZXZlbnRzIGFjY2lkZW50YWwgdGV4dCBzZWxlY3Rpb24gb24gQW5kcm9pZFxuICAgICAgICAgICAgaWYgKCF0aGlzLmZvckVsZW1lbnRfLmhhc0F0dHJpYnV0ZSgndGFiaW5kZXgnKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZm9yRWxlbWVudF8uc2V0QXR0cmlidXRlKCd0YWJpbmRleCcsICcwJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmJvdW5kTW91c2VFbnRlckhhbmRsZXIgPSB0aGlzLmhhbmRsZU1vdXNlRW50ZXJfLmJpbmQodGhpcyk7XG4gICAgICAgICAgICB0aGlzLmJvdW5kTW91c2VMZWF2ZUhhbmRsZXIgPSB0aGlzLmhhbmRsZU1vdXNlTGVhdmVfLmJpbmQodGhpcyk7XG4gICAgICAgICAgICB0aGlzLmZvckVsZW1lbnRfLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZW50ZXInLCB0aGlzLmJvdW5kTW91c2VFbnRlckhhbmRsZXIsIGZhbHNlKTtcbiAgICAgICAgICAgIHRoaXMuZm9yRWxlbWVudF8uYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCB0aGlzLmJvdW5kTW91c2VFbnRlckhhbmRsZXIsIGZhbHNlKTtcbiAgICAgICAgICAgIHRoaXMuZm9yRWxlbWVudF8uYWRkRXZlbnRMaXN0ZW5lcignbW91c2VsZWF2ZScsIHRoaXMuYm91bmRNb3VzZUxlYXZlSGFuZGxlciwgZmFsc2UpO1xuICAgICAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCB0aGlzLmJvdW5kTW91c2VMZWF2ZUhhbmRsZXIpO1xuICAgICAgICB9XG4gICAgfVxufTtcbi8vIFRoZSBjb21wb25lbnQgcmVnaXN0ZXJzIGl0c2VsZi4gSXQgY2FuIGFzc3VtZSBjb21wb25lbnRIYW5kbGVyIGlzIGF2YWlsYWJsZVxuLy8gaW4gdGhlIGdsb2JhbCBzY29wZS5cbmNvbXBvbmVudEhhbmRsZXIucmVnaXN0ZXIoe1xuICAgIGNvbnN0cnVjdG9yOiBNYXRlcmlhbFRvb2x0aXAsXG4gICAgY2xhc3NBc1N0cmluZzogJ01hdGVyaWFsVG9vbHRpcCcsXG4gICAgY3NzQ2xhc3M6ICdtZGwtdG9vbHRpcCdcbn0pO1xuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTUgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAgICogQ2xhc3MgY29uc3RydWN0b3IgZm9yIExheW91dCBNREwgY29tcG9uZW50LlxuICAgKiBJbXBsZW1lbnRzIE1ETCBjb21wb25lbnQgZGVzaWduIHBhdHRlcm4gZGVmaW5lZCBhdDpcbiAgICogaHR0cHM6Ly9naXRodWIuY29tL2phc29ubWF5ZXMvbWRsLWNvbXBvbmVudC1kZXNpZ24tcGF0dGVyblxuICAgKlxuICAgKiBAY29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxlbWVudCBUaGUgZWxlbWVudCB0aGF0IHdpbGwgYmUgdXBncmFkZWQuXG4gICAqL1xudmFyIE1hdGVyaWFsTGF5b3V0ID0gZnVuY3Rpb24gTWF0ZXJpYWxMYXlvdXQoZWxlbWVudCkge1xuICAgIHRoaXMuZWxlbWVudF8gPSBlbGVtZW50O1xuICAgIC8vIEluaXRpYWxpemUgaW5zdGFuY2UuXG4gICAgdGhpcy5pbml0KCk7XG59O1xud2luZG93WydNYXRlcmlhbExheW91dCddID0gTWF0ZXJpYWxMYXlvdXQ7XG4vKipcbiAgICogU3RvcmUgY29uc3RhbnRzIGluIG9uZSBwbGFjZSBzbyB0aGV5IGNhbiBiZSB1cGRhdGVkIGVhc2lseS5cbiAgICpcbiAgICogQGVudW0ge3N0cmluZyB8IG51bWJlcn1cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbExheW91dC5wcm90b3R5cGUuQ29uc3RhbnRfID0ge1xuICAgIE1BWF9XSURUSDogJyhtYXgtd2lkdGg6IDEwMjRweCknLFxuICAgIFRBQl9TQ1JPTExfUElYRUxTOiAxMDAsXG4gICAgUkVTSVpFX1RJTUVPVVQ6IDEwMCxcbiAgICBNRU5VX0lDT046ICdtZW51JyxcbiAgICBDSEVWUk9OX0xFRlQ6ICdjaGV2cm9uX2xlZnQnLFxuICAgIENIRVZST05fUklHSFQ6ICdjaGV2cm9uX3JpZ2h0J1xufTtcbi8qKlxuICAgKiBLZXljb2RlcywgZm9yIGNvZGUgcmVhZGFiaWxpdHkuXG4gICAqXG4gICAqIEBlbnVtIHtudW1iZXJ9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxMYXlvdXQucHJvdG90eXBlLktleWNvZGVzXyA9IHtcbiAgICBFTlRFUjogMTMsXG4gICAgRVNDQVBFOiAyNyxcbiAgICBTUEFDRTogMzJcbn07XG4vKipcbiAgICogTW9kZXMuXG4gICAqXG4gICAqIEBlbnVtIHtudW1iZXJ9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxMYXlvdXQucHJvdG90eXBlLk1vZGVfID0ge1xuICAgIFNUQU5EQVJEOiAwLFxuICAgIFNFQU1FRDogMSxcbiAgICBXQVRFUkZBTEw6IDIsXG4gICAgU0NST0xMOiAzXG59O1xuLyoqXG4gICAqIFN0b3JlIHN0cmluZ3MgZm9yIGNsYXNzIG5hbWVzIGRlZmluZWQgYnkgdGhpcyBjb21wb25lbnQgdGhhdCBhcmUgdXNlZCBpblxuICAgKiBKYXZhU2NyaXB0LiBUaGlzIGFsbG93cyB1cyB0byBzaW1wbHkgY2hhbmdlIGl0IGluIG9uZSBwbGFjZSBzaG91bGQgd2VcbiAgICogZGVjaWRlIHRvIG1vZGlmeSBhdCBhIGxhdGVyIGRhdGUuXG4gICAqXG4gICAqIEBlbnVtIHtzdHJpbmd9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxMYXlvdXQucHJvdG90eXBlLkNzc0NsYXNzZXNfID0ge1xuICAgIENPTlRBSU5FUjogJ21kbC1sYXlvdXRfX2NvbnRhaW5lcicsXG4gICAgSEVBREVSOiAnbWRsLWxheW91dF9faGVhZGVyJyxcbiAgICBEUkFXRVI6ICdtZGwtbGF5b3V0X19kcmF3ZXInLFxuICAgIENPTlRFTlQ6ICdtZGwtbGF5b3V0X19jb250ZW50JyxcbiAgICBEUkFXRVJfQlROOiAnbWRsLWxheW91dF9fZHJhd2VyLWJ1dHRvbicsXG4gICAgSUNPTjogJ21hdGVyaWFsLWljb25zJyxcbiAgICBKU19SSVBQTEVfRUZGRUNUOiAnbWRsLWpzLXJpcHBsZS1lZmZlY3QnLFxuICAgIFJJUFBMRV9DT05UQUlORVI6ICdtZGwtbGF5b3V0X190YWItcmlwcGxlLWNvbnRhaW5lcicsXG4gICAgUklQUExFOiAnbWRsLXJpcHBsZScsXG4gICAgUklQUExFX0lHTk9SRV9FVkVOVFM6ICdtZGwtanMtcmlwcGxlLWVmZmVjdC0taWdub3JlLWV2ZW50cycsXG4gICAgSEVBREVSX1NFQU1FRDogJ21kbC1sYXlvdXRfX2hlYWRlci0tc2VhbWVkJyxcbiAgICBIRUFERVJfV0FURVJGQUxMOiAnbWRsLWxheW91dF9faGVhZGVyLS13YXRlcmZhbGwnLFxuICAgIEhFQURFUl9TQ1JPTEw6ICdtZGwtbGF5b3V0X19oZWFkZXItLXNjcm9sbCcsXG4gICAgRklYRURfSEVBREVSOiAnbWRsLWxheW91dC0tZml4ZWQtaGVhZGVyJyxcbiAgICBPQkZVU0NBVE9SOiAnbWRsLWxheW91dF9fb2JmdXNjYXRvcicsXG4gICAgVEFCX0JBUjogJ21kbC1sYXlvdXRfX3RhYi1iYXInLFxuICAgIFRBQl9DT05UQUlORVI6ICdtZGwtbGF5b3V0X190YWItYmFyLWNvbnRhaW5lcicsXG4gICAgVEFCOiAnbWRsLWxheW91dF9fdGFiJyxcbiAgICBUQUJfQkFSX0JVVFRPTjogJ21kbC1sYXlvdXRfX3RhYi1iYXItYnV0dG9uJyxcbiAgICBUQUJfQkFSX0xFRlRfQlVUVE9OOiAnbWRsLWxheW91dF9fdGFiLWJhci1sZWZ0LWJ1dHRvbicsXG4gICAgVEFCX0JBUl9SSUdIVF9CVVRUT046ICdtZGwtbGF5b3V0X190YWItYmFyLXJpZ2h0LWJ1dHRvbicsXG4gICAgUEFORUw6ICdtZGwtbGF5b3V0X190YWItcGFuZWwnLFxuICAgIEhBU19EUkFXRVI6ICdoYXMtZHJhd2VyJyxcbiAgICBIQVNfVEFCUzogJ2hhcy10YWJzJyxcbiAgICBIQVNfU0NST0xMSU5HX0hFQURFUjogJ2hhcy1zY3JvbGxpbmctaGVhZGVyJyxcbiAgICBDQVNUSU5HX1NIQURPVzogJ2lzLWNhc3Rpbmctc2hhZG93JyxcbiAgICBJU19DT01QQUNUOiAnaXMtY29tcGFjdCcsXG4gICAgSVNfU01BTExfU0NSRUVOOiAnaXMtc21hbGwtc2NyZWVuJyxcbiAgICBJU19EUkFXRVJfT1BFTjogJ2lzLXZpc2libGUnLFxuICAgIElTX0FDVElWRTogJ2lzLWFjdGl2ZScsXG4gICAgSVNfVVBHUkFERUQ6ICdpcy11cGdyYWRlZCcsXG4gICAgSVNfQU5JTUFUSU5HOiAnaXMtYW5pbWF0aW5nJyxcbiAgICBPTl9MQVJHRV9TQ1JFRU46ICdtZGwtbGF5b3V0LS1sYXJnZS1zY3JlZW4tb25seScsXG4gICAgT05fU01BTExfU0NSRUVOOiAnbWRsLWxheW91dC0tc21hbGwtc2NyZWVuLW9ubHknXG59O1xuLyoqXG4gICAqIEhhbmRsZXMgc2Nyb2xsaW5nIG9uIHRoZSBjb250ZW50LlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsTGF5b3V0LnByb3RvdHlwZS5jb250ZW50U2Nyb2xsSGFuZGxlcl8gPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuaGVhZGVyXy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5JU19BTklNQVRJTkcpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGhlYWRlclZpc2libGUgPSAhdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5JU19TTUFMTF9TQ1JFRU4pIHx8IHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uRklYRURfSEVBREVSKTtcbiAgICBpZiAodGhpcy5jb250ZW50Xy5zY3JvbGxUb3AgPiAwICYmICF0aGlzLmhlYWRlcl8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfQ09NUEFDVCkpIHtcbiAgICAgICAgdGhpcy5oZWFkZXJfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5DQVNUSU5HX1NIQURPVyk7XG4gICAgICAgIHRoaXMuaGVhZGVyXy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfQ09NUEFDVCk7XG4gICAgICAgIGlmIChoZWFkZXJWaXNpYmxlKSB7XG4gICAgICAgICAgICB0aGlzLmhlYWRlcl8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLklTX0FOSU1BVElORyk7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHRoaXMuY29udGVudF8uc2Nyb2xsVG9wIDw9IDAgJiYgdGhpcy5oZWFkZXJfLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLklTX0NPTVBBQ1QpKSB7XG4gICAgICAgIHRoaXMuaGVhZGVyXy5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuQ3NzQ2xhc3Nlc18uQ0FTVElOR19TSEFET1cpO1xuICAgICAgICB0aGlzLmhlYWRlcl8uY2xhc3NMaXN0LnJlbW92ZSh0aGlzLkNzc0NsYXNzZXNfLklTX0NPTVBBQ1QpO1xuICAgICAgICBpZiAoaGVhZGVyVmlzaWJsZSkge1xuICAgICAgICAgICAgdGhpcy5oZWFkZXJfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JU19BTklNQVRJTkcpO1xuICAgICAgICB9XG4gICAgfVxufTtcbi8qKlxuICAgKiBIYW5kbGVzIGEga2V5Ym9hcmQgZXZlbnQgb24gdGhlIGRyYXdlci5cbiAgICpcbiAgICogQHBhcmFtIHtFdmVudH0gZXZ0IFRoZSBldmVudCB0aGF0IGZpcmVkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsTGF5b3V0LnByb3RvdHlwZS5rZXlib2FyZEV2ZW50SGFuZGxlcl8gPSBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgLy8gT25seSByZWFjdCB3aGVuIHRoZSBkcmF3ZXIgaXMgb3Blbi5cbiAgICBpZiAoZXZ0LmtleUNvZGUgPT09IHRoaXMuS2V5Y29kZXNfLkVTQ0FQRSAmJiB0aGlzLmRyYXdlcl8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfRFJBV0VSX09QRU4pKSB7XG4gICAgICAgIHRoaXMudG9nZ2xlRHJhd2VyKCk7XG4gICAgfVxufTtcbi8qKlxuICAgKiBIYW5kbGVzIGNoYW5nZXMgaW4gc2NyZWVuIHNpemUuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxMYXlvdXQucHJvdG90eXBlLnNjcmVlblNpemVIYW5kbGVyXyA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5zY3JlZW5TaXplTWVkaWFRdWVyeV8ubWF0Y2hlcykge1xuICAgICAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JU19TTUFMTF9TQ1JFRU4pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LnJlbW92ZSh0aGlzLkNzc0NsYXNzZXNfLklTX1NNQUxMX1NDUkVFTik7XG4gICAgICAgIC8vIENvbGxhcHNlIGRyYXdlciAoaWYgYW55KSB3aGVuIG1vdmluZyB0byBhIGxhcmdlIHNjcmVlbiBzaXplLlxuICAgICAgICBpZiAodGhpcy5kcmF3ZXJfKSB7XG4gICAgICAgICAgICB0aGlzLmRyYXdlcl8uY2xhc3NMaXN0LnJlbW92ZSh0aGlzLkNzc0NsYXNzZXNfLklTX0RSQVdFUl9PUEVOKTtcbiAgICAgICAgICAgIHRoaXMub2JmdXNjYXRvcl8uY2xhc3NMaXN0LnJlbW92ZSh0aGlzLkNzc0NsYXNzZXNfLklTX0RSQVdFUl9PUEVOKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG4vKipcbiAgICogSGFuZGxlcyBldmVudHMgb2YgZHJhd2VyIGJ1dHRvbi5cbiAgICpcbiAgICogQHBhcmFtIHtFdmVudH0gZXZ0IFRoZSBldmVudCB0aGF0IGZpcmVkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsTGF5b3V0LnByb3RvdHlwZS5kcmF3ZXJUb2dnbGVIYW5kbGVyXyA9IGZ1bmN0aW9uIChldnQpIHtcbiAgICBpZiAoZXZ0ICYmIGV2dC50eXBlID09PSAna2V5ZG93bicpIHtcbiAgICAgICAgaWYgKGV2dC5rZXlDb2RlID09PSB0aGlzLktleWNvZGVzXy5TUEFDRSB8fCBldnQua2V5Q29kZSA9PT0gdGhpcy5LZXljb2Rlc18uRU5URVIpIHtcbiAgICAgICAgICAgIC8vIHByZXZlbnQgc2Nyb2xsaW5nIGluIGRyYXdlciBuYXZcbiAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gcHJldmVudCBvdGhlciBrZXlzXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICB9XG4gICAgdGhpcy50b2dnbGVEcmF3ZXIoKTtcbn07XG4vKipcbiAgICogSGFuZGxlcyAodW4pc2V0dGluZyB0aGUgYGlzLWFuaW1hdGluZ2AgY2xhc3NcbiAgICpcbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbExheW91dC5wcm90b3R5cGUuaGVhZGVyVHJhbnNpdGlvbkVuZEhhbmRsZXJfID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuaGVhZGVyXy5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfQU5JTUFUSU5HKTtcbn07XG4vKipcbiAgICogSGFuZGxlcyBleHBhbmRpbmcgdGhlIGhlYWRlciBvbiBjbGlja1xuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsTGF5b3V0LnByb3RvdHlwZS5oZWFkZXJDbGlja0hhbmRsZXJfID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmhlYWRlcl8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfQ09NUEFDVCkpIHtcbiAgICAgICAgdGhpcy5oZWFkZXJfLmNsYXNzTGlzdC5yZW1vdmUodGhpcy5Dc3NDbGFzc2VzXy5JU19DT01QQUNUKTtcbiAgICAgICAgdGhpcy5oZWFkZXJfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JU19BTklNQVRJTkcpO1xuICAgIH1cbn07XG4vKipcbiAgICogUmVzZXQgdGFiIHN0YXRlLCBkcm9wcGluZyBhY3RpdmUgY2xhc3Nlc1xuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsTGF5b3V0LnByb3RvdHlwZS5yZXNldFRhYlN0YXRlXyA9IGZ1bmN0aW9uICh0YWJCYXIpIHtcbiAgICBmb3IgKHZhciBrID0gMDsgayA8IHRhYkJhci5sZW5ndGg7IGsrKykge1xuICAgICAgICB0YWJCYXJba10uY2xhc3NMaXN0LnJlbW92ZSh0aGlzLkNzc0NsYXNzZXNfLklTX0FDVElWRSk7XG4gICAgfVxufTtcbi8qKlxuICAgKiBSZXNldCBwYW5lbCBzdGF0ZSwgZHJvcGluZyBhY3RpdmUgY2xhc3Nlc1xuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsTGF5b3V0LnByb3RvdHlwZS5yZXNldFBhbmVsU3RhdGVfID0gZnVuY3Rpb24gKHBhbmVscykge1xuICAgIGZvciAodmFyIGogPSAwOyBqIDwgcGFuZWxzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHBhbmVsc1tqXS5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfQUNUSVZFKTtcbiAgICB9XG59O1xuLyoqXG4gICogVG9nZ2xlIGRyYXdlciBzdGF0ZVxuICAqXG4gICogQHB1YmxpY1xuICAqL1xuTWF0ZXJpYWxMYXlvdXQucHJvdG90eXBlLnRvZ2dsZURyYXdlciA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZHJhd2VyQnV0dG9uID0gdGhpcy5lbGVtZW50Xy5xdWVyeVNlbGVjdG9yKCcuJyArIHRoaXMuQ3NzQ2xhc3Nlc18uRFJBV0VSX0JUTik7XG4gICAgdGhpcy5kcmF3ZXJfLmNsYXNzTGlzdC50b2dnbGUodGhpcy5Dc3NDbGFzc2VzXy5JU19EUkFXRVJfT1BFTik7XG4gICAgdGhpcy5vYmZ1c2NhdG9yXy5jbGFzc0xpc3QudG9nZ2xlKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfRFJBV0VSX09QRU4pO1xuICAgIC8vIFNldCBhY2Nlc3NpYmlsaXR5IHByb3BlcnRpZXMuXG4gICAgaWYgKHRoaXMuZHJhd2VyXy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5JU19EUkFXRVJfT1BFTikpIHtcbiAgICAgICAgdGhpcy5kcmF3ZXJfLnNldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nLCAnZmFsc2UnKTtcbiAgICAgICAgZHJhd2VyQnV0dG9uLnNldEF0dHJpYnV0ZSgnYXJpYS1leHBhbmRlZCcsICd0cnVlJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5kcmF3ZXJfLnNldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nLCAndHJ1ZScpO1xuICAgICAgICBkcmF3ZXJCdXR0b24uc2V0QXR0cmlidXRlKCdhcmlhLWV4cGFuZGVkJywgJ2ZhbHNlJyk7XG4gICAgfVxufTtcbk1hdGVyaWFsTGF5b3V0LnByb3RvdHlwZVsndG9nZ2xlRHJhd2VyJ10gPSBNYXRlcmlhbExheW91dC5wcm90b3R5cGUudG9nZ2xlRHJhd2VyO1xuLyoqXG4gICAqIEluaXRpYWxpemUgZWxlbWVudC5cbiAgICovXG5NYXRlcmlhbExheW91dC5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5lbGVtZW50Xykge1xuICAgICAgICB2YXIgY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIGNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uQ09OVEFJTkVSKTtcbiAgICAgICAgdmFyIGZvY3VzZWRFbGVtZW50ID0gdGhpcy5lbGVtZW50Xy5xdWVyeVNlbGVjdG9yKCc6Zm9jdXMnKTtcbiAgICAgICAgdGhpcy5lbGVtZW50Xy5wYXJlbnRFbGVtZW50Lmluc2VydEJlZm9yZShjb250YWluZXIsIHRoaXMuZWxlbWVudF8pO1xuICAgICAgICB0aGlzLmVsZW1lbnRfLnBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQodGhpcy5lbGVtZW50Xyk7XG4gICAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZCh0aGlzLmVsZW1lbnRfKTtcbiAgICAgICAgaWYgKGZvY3VzZWRFbGVtZW50KSB7XG4gICAgICAgICAgICBmb2N1c2VkRWxlbWVudC5mb2N1cygpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBkaXJlY3RDaGlsZHJlbiA9IHRoaXMuZWxlbWVudF8uY2hpbGROb2RlcztcbiAgICAgICAgdmFyIG51bUNoaWxkcmVuID0gZGlyZWN0Q2hpbGRyZW4ubGVuZ3RoO1xuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IG51bUNoaWxkcmVuOyBjKyspIHtcbiAgICAgICAgICAgIHZhciBjaGlsZCA9IGRpcmVjdENoaWxkcmVuW2NdO1xuICAgICAgICAgICAgaWYgKGNoaWxkLmNsYXNzTGlzdCAmJiBjaGlsZC5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5IRUFERVIpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5oZWFkZXJfID0gY2hpbGQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY2hpbGQuY2xhc3NMaXN0ICYmIGNoaWxkLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLkRSQVdFUikpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRyYXdlcl8gPSBjaGlsZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjaGlsZC5jbGFzc0xpc3QgJiYgY2hpbGQuY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uQ09OVEVOVCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnRlbnRfID0gY2hpbGQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BhZ2VzaG93JywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGlmIChlLnBlcnNpc3RlZCkge1xuICAgICAgICAgICAgICAgIC8vIHdoZW4gcGFnZSBpcyBsb2FkZWQgZnJvbSBiYWNrL2ZvcndhcmQgY2FjaGVcbiAgICAgICAgICAgICAgICAvLyB0cmlnZ2VyIHJlcGFpbnQgdG8gbGV0IGxheW91dCBzY3JvbGwgaW4gc2FmYXJpXG4gICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50Xy5zdHlsZS5vdmVyZmxvd1kgPSAnaGlkZGVuJztcbiAgICAgICAgICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmVsZW1lbnRfLnN0eWxlLm92ZXJmbG93WSA9ICcnO1xuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0uYmluZCh0aGlzKSwgZmFsc2UpO1xuICAgICAgICBpZiAodGhpcy5oZWFkZXJfKSB7XG4gICAgICAgICAgICB0aGlzLnRhYkJhcl8gPSB0aGlzLmhlYWRlcl8ucXVlcnlTZWxlY3RvcignLicgKyB0aGlzLkNzc0NsYXNzZXNfLlRBQl9CQVIpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBtb2RlID0gdGhpcy5Nb2RlXy5TVEFOREFSRDtcbiAgICAgICAgaWYgKHRoaXMuaGVhZGVyXykge1xuICAgICAgICAgICAgaWYgKHRoaXMuaGVhZGVyXy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5IRUFERVJfU0VBTUVEKSkge1xuICAgICAgICAgICAgICAgIG1vZGUgPSB0aGlzLk1vZGVfLlNFQU1FRDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5oZWFkZXJfLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLkhFQURFUl9XQVRFUkZBTEwpKSB7XG4gICAgICAgICAgICAgICAgbW9kZSA9IHRoaXMuTW9kZV8uV0FURVJGQUxMO1xuICAgICAgICAgICAgICAgIHRoaXMuaGVhZGVyXy5hZGRFdmVudExpc3RlbmVyKCd0cmFuc2l0aW9uZW5kJywgdGhpcy5oZWFkZXJUcmFuc2l0aW9uRW5kSGFuZGxlcl8uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICAgICAgdGhpcy5oZWFkZXJfLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5oZWFkZXJDbGlja0hhbmRsZXJfLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmhlYWRlcl8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uSEVBREVSX1NDUk9MTCkpIHtcbiAgICAgICAgICAgICAgICBtb2RlID0gdGhpcy5Nb2RlXy5TQ1JPTEw7XG4gICAgICAgICAgICAgICAgY29udGFpbmVyLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5IQVNfU0NST0xMSU5HX0hFQURFUik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobW9kZSA9PT0gdGhpcy5Nb2RlXy5TVEFOREFSRCkge1xuICAgICAgICAgICAgICAgIHRoaXMuaGVhZGVyXy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uQ0FTVElOR19TSEFET1cpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRhYkJhcl8pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50YWJCYXJfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5DQVNUSU5HX1NIQURPVyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChtb2RlID09PSB0aGlzLk1vZGVfLlNFQU1FRCB8fCBtb2RlID09PSB0aGlzLk1vZGVfLlNDUk9MTCkge1xuICAgICAgICAgICAgICAgIHRoaXMuaGVhZGVyXy5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuQ3NzQ2xhc3Nlc18uQ0FTVElOR19TSEFET1cpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRhYkJhcl8pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50YWJCYXJfLmNsYXNzTGlzdC5yZW1vdmUodGhpcy5Dc3NDbGFzc2VzXy5DQVNUSU5HX1NIQURPVyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChtb2RlID09PSB0aGlzLk1vZGVfLldBVEVSRkFMTCkge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBhbmQgcmVtb3ZlIHNoYWRvd3MgZGVwZW5kaW5nIG9uIHNjcm9sbCBwb3NpdGlvbi5cbiAgICAgICAgICAgICAgICAvLyBBbHNvIGFkZC9yZW1vdmUgYXV4aWxpYXJ5IGNsYXNzIGZvciBzdHlsaW5nIG9mIHRoZSBjb21wYWN0IHZlcnNpb24gb2ZcbiAgICAgICAgICAgICAgICAvLyB0aGUgaGVhZGVyLlxuICAgICAgICAgICAgICAgIHRoaXMuY29udGVudF8uYWRkRXZlbnRMaXN0ZW5lcignc2Nyb2xsJywgdGhpcy5jb250ZW50U2Nyb2xsSGFuZGxlcl8uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICAgICAgdGhpcy5jb250ZW50U2Nyb2xsSGFuZGxlcl8oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBBZGQgZHJhd2VyIHRvZ2dsaW5nIGJ1dHRvbiB0byBvdXIgbGF5b3V0LCBpZiB3ZSBoYXZlIGFuIG9wZW5hYmxlIGRyYXdlci5cbiAgICAgICAgaWYgKHRoaXMuZHJhd2VyXykge1xuICAgICAgICAgICAgdmFyIGRyYXdlckJ1dHRvbiA9IHRoaXMuZWxlbWVudF8ucXVlcnlTZWxlY3RvcignLicgKyB0aGlzLkNzc0NsYXNzZXNfLkRSQVdFUl9CVE4pO1xuICAgICAgICAgICAgaWYgKCFkcmF3ZXJCdXR0b24pIHtcbiAgICAgICAgICAgICAgICBkcmF3ZXJCdXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICBkcmF3ZXJCdXR0b24uc2V0QXR0cmlidXRlKCdhcmlhLWV4cGFuZGVkJywgJ2ZhbHNlJyk7XG4gICAgICAgICAgICAgICAgZHJhd2VyQnV0dG9uLnNldEF0dHJpYnV0ZSgncm9sZScsICdidXR0b24nKTtcbiAgICAgICAgICAgICAgICBkcmF3ZXJCdXR0b24uc2V0QXR0cmlidXRlKCd0YWJpbmRleCcsICcwJyk7XG4gICAgICAgICAgICAgICAgZHJhd2VyQnV0dG9uLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5EUkFXRVJfQlROKTtcbiAgICAgICAgICAgICAgICB2YXIgZHJhd2VyQnV0dG9uSWNvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2knKTtcbiAgICAgICAgICAgICAgICBkcmF3ZXJCdXR0b25JY29uLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JQ09OKTtcbiAgICAgICAgICAgICAgICBkcmF3ZXJCdXR0b25JY29uLmlubmVySFRNTCA9IHRoaXMuQ29uc3RhbnRfLk1FTlVfSUNPTjtcbiAgICAgICAgICAgICAgICBkcmF3ZXJCdXR0b24uYXBwZW5kQ2hpbGQoZHJhd2VyQnV0dG9uSWNvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5kcmF3ZXJfLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLk9OX0xBUkdFX1NDUkVFTikpIHtcbiAgICAgICAgICAgICAgICAvL0lmIGRyYXdlciBoYXMgT05fTEFSR0VfU0NSRUVOIGNsYXNzIHRoZW4gYWRkIGl0IHRvIHRoZSBkcmF3ZXIgdG9nZ2xlIGJ1dHRvbiBhcyB3ZWxsLlxuICAgICAgICAgICAgICAgIGRyYXdlckJ1dHRvbi5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uT05fTEFSR0VfU0NSRUVOKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5kcmF3ZXJfLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLkNzc0NsYXNzZXNfLk9OX1NNQUxMX1NDUkVFTikpIHtcbiAgICAgICAgICAgICAgICAvL0lmIGRyYXdlciBoYXMgT05fU01BTExfU0NSRUVOIGNsYXNzIHRoZW4gYWRkIGl0IHRvIHRoZSBkcmF3ZXIgdG9nZ2xlIGJ1dHRvbiBhcyB3ZWxsLlxuICAgICAgICAgICAgICAgIGRyYXdlckJ1dHRvbi5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uT05fU01BTExfU0NSRUVOKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRyYXdlckJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuZHJhd2VyVG9nZ2xlSGFuZGxlcl8uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICBkcmF3ZXJCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIHRoaXMuZHJhd2VyVG9nZ2xlSGFuZGxlcl8uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICAvLyBBZGQgYSBjbGFzcyBpZiB0aGUgbGF5b3V0IGhhcyBhIGRyYXdlciwgZm9yIGFsdGVyaW5nIHRoZSBsZWZ0IHBhZGRpbmcuXG4gICAgICAgICAgICAvLyBBZGRzIHRoZSBIQVNfRFJBV0VSIHRvIHRoZSBlbGVtZW50cyBzaW5jZSB0aGlzLmhlYWRlcl8gbWF5IG9yIG1heVxuICAgICAgICAgICAgLy8gbm90IGJlIHByZXNlbnQuXG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5IQVNfRFJBV0VSKTtcbiAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgYSBmaXhlZCBoZWFkZXIsIGFkZCB0aGUgYnV0dG9uIHRvIHRoZSBoZWFkZXIgcmF0aGVyIHRoYW5cbiAgICAgICAgICAgIC8vIHRoZSBsYXlvdXQuXG4gICAgICAgICAgICBpZiAodGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5GSVhFRF9IRUFERVIpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5oZWFkZXJfLmluc2VydEJlZm9yZShkcmF3ZXJCdXR0b24sIHRoaXMuaGVhZGVyXy5maXJzdENoaWxkKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50Xy5pbnNlcnRCZWZvcmUoZHJhd2VyQnV0dG9uLCB0aGlzLmNvbnRlbnRfKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBvYmZ1c2NhdG9yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICBvYmZ1c2NhdG9yLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5PQkZVU0NBVE9SKTtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudF8uYXBwZW5kQ2hpbGQob2JmdXNjYXRvcik7XG4gICAgICAgICAgICBvYmZ1c2NhdG9yLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5kcmF3ZXJUb2dnbGVIYW5kbGVyXy5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIHRoaXMub2JmdXNjYXRvcl8gPSBvYmZ1c2NhdG9yO1xuICAgICAgICAgICAgdGhpcy5kcmF3ZXJfLmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCB0aGlzLmtleWJvYXJkRXZlbnRIYW5kbGVyXy5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIHRoaXMuZHJhd2VyXy5zZXRBdHRyaWJ1dGUoJ2FyaWEtaGlkZGVuJywgJ3RydWUnKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBLZWVwIGFuIGV5ZSBvbiBzY3JlZW4gc2l6ZSwgYW5kIGFkZC9yZW1vdmUgYXV4aWxpYXJ5IGNsYXNzIGZvciBzdHlsaW5nXG4gICAgICAgIC8vIG9mIHNtYWxsIHNjcmVlbnMuXG4gICAgICAgIHRoaXMuc2NyZWVuU2l6ZU1lZGlhUXVlcnlfID0gd2luZG93Lm1hdGNoTWVkaWEodGhpcy5Db25zdGFudF8uTUFYX1dJRFRIKTtcbiAgICAgICAgdGhpcy5zY3JlZW5TaXplTWVkaWFRdWVyeV8uYWRkTGlzdGVuZXIodGhpcy5zY3JlZW5TaXplSGFuZGxlcl8uYmluZCh0aGlzKSk7XG4gICAgICAgIHRoaXMuc2NyZWVuU2l6ZUhhbmRsZXJfKCk7XG4gICAgICAgIC8vIEluaXRpYWxpemUgdGFicywgaWYgYW55LlxuICAgICAgICBpZiAodGhpcy5oZWFkZXJfICYmIHRoaXMudGFiQmFyXykge1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uSEFTX1RBQlMpO1xuICAgICAgICAgICAgdmFyIHRhYkNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgdGFiQ29udGFpbmVyLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5UQUJfQ09OVEFJTkVSKTtcbiAgICAgICAgICAgIHRoaXMuaGVhZGVyXy5pbnNlcnRCZWZvcmUodGFiQ29udGFpbmVyLCB0aGlzLnRhYkJhcl8pO1xuICAgICAgICAgICAgdGhpcy5oZWFkZXJfLnJlbW92ZUNoaWxkKHRoaXMudGFiQmFyXyk7XG4gICAgICAgICAgICB2YXIgbGVmdEJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgbGVmdEJ1dHRvbi5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uVEFCX0JBUl9CVVRUT04pO1xuICAgICAgICAgICAgbGVmdEJ1dHRvbi5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uVEFCX0JBUl9MRUZUX0JVVFRPTik7XG4gICAgICAgICAgICB2YXIgbGVmdEJ1dHRvbkljb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpJyk7XG4gICAgICAgICAgICBsZWZ0QnV0dG9uSWNvbi5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uSUNPTik7XG4gICAgICAgICAgICBsZWZ0QnV0dG9uSWNvbi50ZXh0Q29udGVudCA9IHRoaXMuQ29uc3RhbnRfLkNIRVZST05fTEVGVDtcbiAgICAgICAgICAgIGxlZnRCdXR0b24uYXBwZW5kQ2hpbGQobGVmdEJ1dHRvbkljb24pO1xuICAgICAgICAgICAgbGVmdEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRhYkJhcl8uc2Nyb2xsTGVmdCAtPSB0aGlzLkNvbnN0YW50Xy5UQUJfU0NST0xMX1BJWEVMUztcbiAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICB2YXIgcmlnaHRCdXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgIHJpZ2h0QnV0dG9uLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5UQUJfQkFSX0JVVFRPTik7XG4gICAgICAgICAgICByaWdodEJ1dHRvbi5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uVEFCX0JBUl9SSUdIVF9CVVRUT04pO1xuICAgICAgICAgICAgdmFyIHJpZ2h0QnV0dG9uSWNvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2knKTtcbiAgICAgICAgICAgIHJpZ2h0QnV0dG9uSWNvbi5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uSUNPTik7XG4gICAgICAgICAgICByaWdodEJ1dHRvbkljb24udGV4dENvbnRlbnQgPSB0aGlzLkNvbnN0YW50Xy5DSEVWUk9OX1JJR0hUO1xuICAgICAgICAgICAgcmlnaHRCdXR0b24uYXBwZW5kQ2hpbGQocmlnaHRCdXR0b25JY29uKTtcbiAgICAgICAgICAgIHJpZ2h0QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHRoaXMudGFiQmFyXy5zY3JvbGxMZWZ0ICs9IHRoaXMuQ29uc3RhbnRfLlRBQl9TQ1JPTExfUElYRUxTO1xuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIHRhYkNvbnRhaW5lci5hcHBlbmRDaGlsZChsZWZ0QnV0dG9uKTtcbiAgICAgICAgICAgIHRhYkNvbnRhaW5lci5hcHBlbmRDaGlsZCh0aGlzLnRhYkJhcl8pO1xuICAgICAgICAgICAgdGFiQ29udGFpbmVyLmFwcGVuZENoaWxkKHJpZ2h0QnV0dG9uKTtcbiAgICAgICAgICAgIC8vIEFkZCBhbmQgcmVtb3ZlIHRhYiBidXR0b25zIGRlcGVuZGluZyBvbiBzY3JvbGwgcG9zaXRpb24gYW5kIHRvdGFsXG4gICAgICAgICAgICAvLyB3aW5kb3cgc2l6ZS5cbiAgICAgICAgICAgIHZhciB0YWJVcGRhdGVIYW5kbGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRhYkJhcl8uc2Nyb2xsTGVmdCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbGVmdEJ1dHRvbi5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfQUNUSVZFKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsZWZ0QnV0dG9uLmNsYXNzTGlzdC5yZW1vdmUodGhpcy5Dc3NDbGFzc2VzXy5JU19BQ1RJVkUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodGhpcy50YWJCYXJfLnNjcm9sbExlZnQgPCB0aGlzLnRhYkJhcl8uc2Nyb2xsV2lkdGggLSB0aGlzLnRhYkJhcl8ub2Zmc2V0V2lkdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmlnaHRCdXR0b24uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLklTX0FDVElWRSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmlnaHRCdXR0b24uY2xhc3NMaXN0LnJlbW92ZSh0aGlzLkNzc0NsYXNzZXNfLklTX0FDVElWRSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfS5iaW5kKHRoaXMpO1xuICAgICAgICAgICAgdGhpcy50YWJCYXJfLmFkZEV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIHRhYlVwZGF0ZUhhbmRsZXIpO1xuICAgICAgICAgICAgdGFiVXBkYXRlSGFuZGxlcigpO1xuICAgICAgICAgICAgLy8gVXBkYXRlIHRhYnMgd2hlbiB0aGUgd2luZG93IHJlc2l6ZXMuXG4gICAgICAgICAgICB2YXIgd2luZG93UmVzaXplSGFuZGxlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgdGltZW91dHMgdG8gbWFrZSBzdXJlIGl0IGRvZXNuJ3QgaGFwcGVuIHRvbyBvZnRlbi5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5yZXNpemVUaW1lb3V0SWRfKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnJlc2l6ZVRpbWVvdXRJZF8pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnJlc2l6ZVRpbWVvdXRJZF8gPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFiVXBkYXRlSGFuZGxlcigpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlc2l6ZVRpbWVvdXRJZF8gPSBudWxsO1xuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSwgdGhpcy5Db25zdGFudF8uUkVTSVpFX1RJTUVPVVQpO1xuICAgICAgICAgICAgfS5iaW5kKHRoaXMpO1xuICAgICAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHdpbmRvd1Jlc2l6ZUhhbmRsZXIpO1xuICAgICAgICAgICAgaWYgKHRoaXMudGFiQmFyXy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5KU19SSVBQTEVfRUZGRUNUKSkge1xuICAgICAgICAgICAgICAgIHRoaXMudGFiQmFyXy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uUklQUExFX0lHTk9SRV9FVkVOVFMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gU2VsZWN0IGVsZW1lbnQgdGFicywgZG9jdW1lbnQgcGFuZWxzXG4gICAgICAgICAgICB2YXIgdGFicyA9IHRoaXMudGFiQmFyXy5xdWVyeVNlbGVjdG9yQWxsKCcuJyArIHRoaXMuQ3NzQ2xhc3Nlc18uVEFCKTtcbiAgICAgICAgICAgIHZhciBwYW5lbHMgPSB0aGlzLmNvbnRlbnRfLnF1ZXJ5U2VsZWN0b3JBbGwoJy4nICsgdGhpcy5Dc3NDbGFzc2VzXy5QQU5FTCk7XG4gICAgICAgICAgICAvLyBDcmVhdGUgbmV3IHRhYnMgZm9yIGVhY2ggdGFiIGVsZW1lbnRcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGFicy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIG5ldyBNYXRlcmlhbExheW91dFRhYih0YWJzW2ldLCB0YWJzLCBwYW5lbHMsIHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLklTX1VQR1JBREVEKTtcbiAgICB9XG59O1xuLyoqXG4gICAqIENvbnN0cnVjdG9yIGZvciBhbiBpbmRpdmlkdWFsIHRhYi5cbiAgICpcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IHRhYiBUaGUgSFRNTCBlbGVtZW50IGZvciB0aGUgdGFiLlxuICAgKiBAcGFyYW0geyFBcnJheTxIVE1MRWxlbWVudD59IHRhYnMgQXJyYXkgd2l0aCBIVE1MIGVsZW1lbnRzIGZvciBhbGwgdGFicy5cbiAgICogQHBhcmFtIHshQXJyYXk8SFRNTEVsZW1lbnQ+fSBwYW5lbHMgQXJyYXkgd2l0aCBIVE1MIGVsZW1lbnRzIGZvciBhbGwgcGFuZWxzLlxuICAgKiBAcGFyYW0ge01hdGVyaWFsTGF5b3V0fSBsYXlvdXQgVGhlIE1hdGVyaWFsTGF5b3V0IG9iamVjdCB0aGF0IG93bnMgdGhlIHRhYi5cbiAgICovXG5mdW5jdGlvbiBNYXRlcmlhbExheW91dFRhYih0YWIsIHRhYnMsIHBhbmVscywgbGF5b3V0KSB7XG4gICAgLyoqXG4gICAgICogQXV4aWxpYXJ5IG1ldGhvZCB0byBwcm9ncmFtbWF0aWNhbGx5IHNlbGVjdCBhIHRhYiBpbiB0aGUgVUkuXG4gICAgICovXG4gICAgZnVuY3Rpb24gc2VsZWN0VGFiKCkge1xuICAgICAgICB2YXIgaHJlZiA9IHRhYi5ocmVmLnNwbGl0KCcjJylbMV07XG4gICAgICAgIHZhciBwYW5lbCA9IGxheW91dC5jb250ZW50Xy5xdWVyeVNlbGVjdG9yKCcjJyArIGhyZWYpO1xuICAgICAgICBsYXlvdXQucmVzZXRUYWJTdGF0ZV8odGFicyk7XG4gICAgICAgIGxheW91dC5yZXNldFBhbmVsU3RhdGVfKHBhbmVscyk7XG4gICAgICAgIHRhYi5jbGFzc0xpc3QuYWRkKGxheW91dC5Dc3NDbGFzc2VzXy5JU19BQ1RJVkUpO1xuICAgICAgICBwYW5lbC5jbGFzc0xpc3QuYWRkKGxheW91dC5Dc3NDbGFzc2VzXy5JU19BQ1RJVkUpO1xuICAgIH1cbiAgICBpZiAobGF5b3V0LnRhYkJhcl8uY2xhc3NMaXN0LmNvbnRhaW5zKGxheW91dC5Dc3NDbGFzc2VzXy5KU19SSVBQTEVfRUZGRUNUKSkge1xuICAgICAgICB2YXIgcmlwcGxlQ29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICByaXBwbGVDb250YWluZXIuY2xhc3NMaXN0LmFkZChsYXlvdXQuQ3NzQ2xhc3Nlc18uUklQUExFX0NPTlRBSU5FUik7XG4gICAgICAgIHJpcHBsZUNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKGxheW91dC5Dc3NDbGFzc2VzXy5KU19SSVBQTEVfRUZGRUNUKTtcbiAgICAgICAgdmFyIHJpcHBsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgcmlwcGxlLmNsYXNzTGlzdC5hZGQobGF5b3V0LkNzc0NsYXNzZXNfLlJJUFBMRSk7XG4gICAgICAgIHJpcHBsZUNvbnRhaW5lci5hcHBlbmRDaGlsZChyaXBwbGUpO1xuICAgICAgICB0YWIuYXBwZW5kQ2hpbGQocmlwcGxlQ29udGFpbmVyKTtcbiAgICB9XG4gICAgdGFiLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgaWYgKHRhYi5nZXRBdHRyaWJ1dGUoJ2hyZWYnKS5jaGFyQXQoMCkgPT09ICcjJykge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgc2VsZWN0VGFiKCk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICB0YWIuc2hvdyA9IHNlbGVjdFRhYjtcbn1cbndpbmRvd1snTWF0ZXJpYWxMYXlvdXRUYWInXSA9IE1hdGVyaWFsTGF5b3V0VGFiO1xuLy8gVGhlIGNvbXBvbmVudCByZWdpc3RlcnMgaXRzZWxmLiBJdCBjYW4gYXNzdW1lIGNvbXBvbmVudEhhbmRsZXIgaXMgYXZhaWxhYmxlXG4vLyBpbiB0aGUgZ2xvYmFsIHNjb3BlLlxuY29tcG9uZW50SGFuZGxlci5yZWdpc3Rlcih7XG4gICAgY29uc3RydWN0b3I6IE1hdGVyaWFsTGF5b3V0LFxuICAgIGNsYXNzQXNTdHJpbmc6ICdNYXRlcmlhbExheW91dCcsXG4gICAgY3NzQ2xhc3M6ICdtZGwtanMtbGF5b3V0J1xufSk7XG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNSBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICAgKiBDbGFzcyBjb25zdHJ1Y3RvciBmb3IgRGF0YSBUYWJsZSBDYXJkIE1ETCBjb21wb25lbnQuXG4gICAqIEltcGxlbWVudHMgTURMIGNvbXBvbmVudCBkZXNpZ24gcGF0dGVybiBkZWZpbmVkIGF0OlxuICAgKiBodHRwczovL2dpdGh1Yi5jb20vamFzb25tYXllcy9tZGwtY29tcG9uZW50LWRlc2lnbi1wYXR0ZXJuXG4gICAqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge0VsZW1lbnR9IGVsZW1lbnQgVGhlIGVsZW1lbnQgdGhhdCB3aWxsIGJlIHVwZ3JhZGVkLlxuICAgKi9cbnZhciBNYXRlcmlhbERhdGFUYWJsZSA9IGZ1bmN0aW9uIE1hdGVyaWFsRGF0YVRhYmxlKGVsZW1lbnQpIHtcbiAgICB0aGlzLmVsZW1lbnRfID0gZWxlbWVudDtcbiAgICAvLyBJbml0aWFsaXplIGluc3RhbmNlLlxuICAgIHRoaXMuaW5pdCgpO1xufTtcbndpbmRvd1snTWF0ZXJpYWxEYXRhVGFibGUnXSA9IE1hdGVyaWFsRGF0YVRhYmxlO1xuLyoqXG4gICAqIFN0b3JlIGNvbnN0YW50cyBpbiBvbmUgcGxhY2Ugc28gdGhleSBjYW4gYmUgdXBkYXRlZCBlYXNpbHkuXG4gICAqXG4gICAqIEBlbnVtIHtzdHJpbmcgfCBudW1iZXJ9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxEYXRhVGFibGUucHJvdG90eXBlLkNvbnN0YW50XyA9IHt9O1xuLyoqXG4gICAqIFN0b3JlIHN0cmluZ3MgZm9yIGNsYXNzIG5hbWVzIGRlZmluZWQgYnkgdGhpcyBjb21wb25lbnQgdGhhdCBhcmUgdXNlZCBpblxuICAgKiBKYXZhU2NyaXB0LiBUaGlzIGFsbG93cyB1cyB0byBzaW1wbHkgY2hhbmdlIGl0IGluIG9uZSBwbGFjZSBzaG91bGQgd2VcbiAgICogZGVjaWRlIHRvIG1vZGlmeSBhdCBhIGxhdGVyIGRhdGUuXG4gICAqXG4gICAqIEBlbnVtIHtzdHJpbmd9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuTWF0ZXJpYWxEYXRhVGFibGUucHJvdG90eXBlLkNzc0NsYXNzZXNfID0ge1xuICAgIERBVEFfVEFCTEU6ICdtZGwtZGF0YS10YWJsZScsXG4gICAgU0VMRUNUQUJMRTogJ21kbC1kYXRhLXRhYmxlLS1zZWxlY3RhYmxlJyxcbiAgICBTRUxFQ1RfRUxFTUVOVDogJ21kbC1kYXRhLXRhYmxlX19zZWxlY3QnLFxuICAgIElTX1NFTEVDVEVEOiAnaXMtc2VsZWN0ZWQnLFxuICAgIElTX1VQR1JBREVEOiAnaXMtdXBncmFkZWQnXG59O1xuLyoqXG4gICAqIEdlbmVyYXRlcyBhbmQgcmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgdG9nZ2xlcyB0aGUgc2VsZWN0aW9uIHN0YXRlIG9mIGFcbiAgICogc2luZ2xlIHJvdyAob3IgbXVsdGlwbGUgcm93cykuXG4gICAqXG4gICAqIEBwYXJhbSB7RWxlbWVudH0gY2hlY2tib3ggQ2hlY2tib3ggdGhhdCB0b2dnbGVzIHRoZSBzZWxlY3Rpb24gc3RhdGUuXG4gICAqIEBwYXJhbSB7RWxlbWVudH0gcm93IFJvdyB0byB0b2dnbGUgd2hlbiBjaGVja2JveCBjaGFuZ2VzLlxuICAgKiBAcGFyYW0geyhBcnJheTxPYmplY3Q+fE5vZGVMaXN0KT19IG9wdF9yb3dzIFJvd3MgdG8gdG9nZ2xlIHdoZW4gY2hlY2tib3ggY2hhbmdlcy5cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbERhdGFUYWJsZS5wcm90b3R5cGUuc2VsZWN0Um93XyA9IGZ1bmN0aW9uIChjaGVja2JveCwgcm93LCBvcHRfcm93cykge1xuICAgIGlmIChyb3cpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChjaGVja2JveC5jaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgcm93LmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JU19TRUxFQ1RFRCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJvdy5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfU0VMRUNURUQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LmJpbmQodGhpcyk7XG4gICAgfVxuICAgIGlmIChvcHRfcm93cykge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGk7XG4gICAgICAgICAgICB2YXIgZWw7XG4gICAgICAgICAgICBpZiAoY2hlY2tib3guY2hlY2tlZCkge1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBvcHRfcm93cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBlbCA9IG9wdF9yb3dzW2ldLnF1ZXJ5U2VsZWN0b3IoJ3RkJykucXVlcnlTZWxlY3RvcignLm1kbC1jaGVja2JveCcpO1xuICAgICAgICAgICAgICAgICAgICBlbFsnTWF0ZXJpYWxDaGVja2JveCddLmNoZWNrKCk7XG4gICAgICAgICAgICAgICAgICAgIG9wdF9yb3dzW2ldLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JU19TRUxFQ1RFRCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgb3B0X3Jvd3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgZWwgPSBvcHRfcm93c1tpXS5xdWVyeVNlbGVjdG9yKCd0ZCcpLnF1ZXJ5U2VsZWN0b3IoJy5tZGwtY2hlY2tib3gnKTtcbiAgICAgICAgICAgICAgICAgICAgZWxbJ01hdGVyaWFsQ2hlY2tib3gnXS51bmNoZWNrKCk7XG4gICAgICAgICAgICAgICAgICAgIG9wdF9yb3dzW2ldLmNsYXNzTGlzdC5yZW1vdmUodGhpcy5Dc3NDbGFzc2VzXy5JU19TRUxFQ1RFRCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LmJpbmQodGhpcyk7XG4gICAgfVxufTtcbi8qKlxuICAgKiBDcmVhdGVzIGEgY2hlY2tib3ggZm9yIGEgc2luZ2xlIG9yIG9yIG11bHRpcGxlIHJvd3MgYW5kIGhvb2tzIHVwIHRoZVxuICAgKiBldmVudCBoYW5kbGluZy5cbiAgICpcbiAgICogQHBhcmFtIHtFbGVtZW50fSByb3cgUm93IHRvIHRvZ2dsZSB3aGVuIGNoZWNrYm94IGNoYW5nZXMuXG4gICAqIEBwYXJhbSB7KEFycmF5PE9iamVjdD58Tm9kZUxpc3QpPX0gb3B0X3Jvd3MgUm93cyB0byB0b2dnbGUgd2hlbiBjaGVja2JveCBjaGFuZ2VzLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsRGF0YVRhYmxlLnByb3RvdHlwZS5jcmVhdGVDaGVja2JveF8gPSBmdW5jdGlvbiAocm93LCBvcHRfcm93cykge1xuICAgIHZhciBsYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xhYmVsJyk7XG4gICAgdmFyIGxhYmVsQ2xhc3NlcyA9IFtcbiAgICAgICAgJ21kbC1jaGVja2JveCcsXG4gICAgICAgICdtZGwtanMtY2hlY2tib3gnLFxuICAgICAgICAnbWRsLWpzLXJpcHBsZS1lZmZlY3QnLFxuICAgICAgICB0aGlzLkNzc0NsYXNzZXNfLlNFTEVDVF9FTEVNRU5UXG4gICAgXTtcbiAgICBsYWJlbC5jbGFzc05hbWUgPSBsYWJlbENsYXNzZXMuam9pbignICcpO1xuICAgIHZhciBjaGVja2JveCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gICAgY2hlY2tib3gudHlwZSA9ICdjaGVja2JveCc7XG4gICAgY2hlY2tib3guY2xhc3NMaXN0LmFkZCgnbWRsLWNoZWNrYm94X19pbnB1dCcpO1xuICAgIGlmIChyb3cpIHtcbiAgICAgICAgY2hlY2tib3guY2hlY2tlZCA9IHJvdy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5JU19TRUxFQ1RFRCk7XG4gICAgICAgIGNoZWNrYm94LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIHRoaXMuc2VsZWN0Um93XyhjaGVja2JveCwgcm93KSk7XG4gICAgfSBlbHNlIGlmIChvcHRfcm93cykge1xuICAgICAgICBjaGVja2JveC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCB0aGlzLnNlbGVjdFJvd18oY2hlY2tib3gsIG51bGwsIG9wdF9yb3dzKSk7XG4gICAgfVxuICAgIGxhYmVsLmFwcGVuZENoaWxkKGNoZWNrYm94KTtcbiAgICBjb21wb25lbnRIYW5kbGVyLnVwZ3JhZGVFbGVtZW50KGxhYmVsLCAnTWF0ZXJpYWxDaGVja2JveCcpO1xuICAgIHJldHVybiBsYWJlbDtcbn07XG4vKipcbiAgICogSW5pdGlhbGl6ZSBlbGVtZW50LlxuICAgKi9cbk1hdGVyaWFsRGF0YVRhYmxlLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmVsZW1lbnRfKSB7XG4gICAgICAgIHZhciBmaXJzdEhlYWRlciA9IHRoaXMuZWxlbWVudF8ucXVlcnlTZWxlY3RvcigndGgnKTtcbiAgICAgICAgdmFyIGJvZHlSb3dzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5lbGVtZW50Xy5xdWVyeVNlbGVjdG9yQWxsKCd0Ym9keSB0cicpKTtcbiAgICAgICAgdmFyIGZvb3RSb3dzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5lbGVtZW50Xy5xdWVyeVNlbGVjdG9yQWxsKCd0Zm9vdCB0cicpKTtcbiAgICAgICAgdmFyIHJvd3MgPSBib2R5Um93cy5jb25jYXQoZm9vdFJvd3MpO1xuICAgICAgICBpZiAodGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5TRUxFQ1RBQkxFKSkge1xuICAgICAgICAgICAgdmFyIHRoID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGgnKTtcbiAgICAgICAgICAgIHZhciBoZWFkZXJDaGVja2JveCA9IHRoaXMuY3JlYXRlQ2hlY2tib3hfKG51bGwsIHJvd3MpO1xuICAgICAgICAgICAgdGguYXBwZW5kQ2hpbGQoaGVhZGVyQ2hlY2tib3gpO1xuICAgICAgICAgICAgZmlyc3RIZWFkZXIucGFyZW50RWxlbWVudC5pbnNlcnRCZWZvcmUodGgsIGZpcnN0SGVhZGVyKTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcm93cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBmaXJzdENlbGwgPSByb3dzW2ldLnF1ZXJ5U2VsZWN0b3IoJ3RkJyk7XG4gICAgICAgICAgICAgICAgaWYgKGZpcnN0Q2VsbCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocm93c1tpXS5wYXJlbnROb2RlLm5vZGVOYW1lLnRvVXBwZXJDYXNlKCkgPT09ICdUQk9EWScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByb3dDaGVja2JveCA9IHRoaXMuY3JlYXRlQ2hlY2tib3hfKHJvd3NbaV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGQuYXBwZW5kQ2hpbGQocm93Q2hlY2tib3gpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJvd3NbaV0uaW5zZXJ0QmVmb3JlKHRkLCBmaXJzdENlbGwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmFkZCh0aGlzLkNzc0NsYXNzZXNfLklTX1VQR1JBREVEKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG4vLyBUaGUgY29tcG9uZW50IHJlZ2lzdGVycyBpdHNlbGYuIEl0IGNhbiBhc3N1bWUgY29tcG9uZW50SGFuZGxlciBpcyBhdmFpbGFibGVcbi8vIGluIHRoZSBnbG9iYWwgc2NvcGUuXG5jb21wb25lbnRIYW5kbGVyLnJlZ2lzdGVyKHtcbiAgICBjb25zdHJ1Y3RvcjogTWF0ZXJpYWxEYXRhVGFibGUsXG4gICAgY2xhc3NBc1N0cmluZzogJ01hdGVyaWFsRGF0YVRhYmxlJyxcbiAgICBjc3NDbGFzczogJ21kbC1qcy1kYXRhLXRhYmxlJ1xufSk7XG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNSBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICAgKiBDbGFzcyBjb25zdHJ1Y3RvciBmb3IgUmlwcGxlIE1ETCBjb21wb25lbnQuXG4gICAqIEltcGxlbWVudHMgTURMIGNvbXBvbmVudCBkZXNpZ24gcGF0dGVybiBkZWZpbmVkIGF0OlxuICAgKiBodHRwczovL2dpdGh1Yi5jb20vamFzb25tYXllcy9tZGwtY29tcG9uZW50LWRlc2lnbi1wYXR0ZXJuXG4gICAqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbGVtZW50IFRoZSBlbGVtZW50IHRoYXQgd2lsbCBiZSB1cGdyYWRlZC5cbiAgICovXG52YXIgTWF0ZXJpYWxSaXBwbGUgPSBmdW5jdGlvbiBNYXRlcmlhbFJpcHBsZShlbGVtZW50KSB7XG4gICAgdGhpcy5lbGVtZW50XyA9IGVsZW1lbnQ7XG4gICAgLy8gSW5pdGlhbGl6ZSBpbnN0YW5jZS5cbiAgICB0aGlzLmluaXQoKTtcbn07XG53aW5kb3dbJ01hdGVyaWFsUmlwcGxlJ10gPSBNYXRlcmlhbFJpcHBsZTtcbi8qKlxuICAgKiBTdG9yZSBjb25zdGFudHMgaW4gb25lIHBsYWNlIHNvIHRoZXkgY2FuIGJlIHVwZGF0ZWQgZWFzaWx5LlxuICAgKlxuICAgKiBAZW51bSB7c3RyaW5nIHwgbnVtYmVyfVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsUmlwcGxlLnByb3RvdHlwZS5Db25zdGFudF8gPSB7XG4gICAgSU5JVElBTF9TQ0FMRTogJ3NjYWxlKDAuMDAwMSwgMC4wMDAxKScsXG4gICAgSU5JVElBTF9TSVpFOiAnMXB4JyxcbiAgICBJTklUSUFMX09QQUNJVFk6ICcwLjQnLFxuICAgIEZJTkFMX09QQUNJVFk6ICcwJyxcbiAgICBGSU5BTF9TQ0FMRTogJydcbn07XG4vKipcbiAgICogU3RvcmUgc3RyaW5ncyBmb3IgY2xhc3MgbmFtZXMgZGVmaW5lZCBieSB0aGlzIGNvbXBvbmVudCB0aGF0IGFyZSB1c2VkIGluXG4gICAqIEphdmFTY3JpcHQuIFRoaXMgYWxsb3dzIHVzIHRvIHNpbXBseSBjaGFuZ2UgaXQgaW4gb25lIHBsYWNlIHNob3VsZCB3ZVxuICAgKiBkZWNpZGUgdG8gbW9kaWZ5IGF0IGEgbGF0ZXIgZGF0ZS5cbiAgICpcbiAgICogQGVudW0ge3N0cmluZ31cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFJpcHBsZS5wcm90b3R5cGUuQ3NzQ2xhc3Nlc18gPSB7XG4gICAgUklQUExFX0NFTlRFUjogJ21kbC1yaXBwbGUtLWNlbnRlcicsXG4gICAgUklQUExFX0VGRkVDVF9JR05PUkVfRVZFTlRTOiAnbWRsLWpzLXJpcHBsZS1lZmZlY3QtLWlnbm9yZS1ldmVudHMnLFxuICAgIFJJUFBMRTogJ21kbC1yaXBwbGUnLFxuICAgIElTX0FOSU1BVElORzogJ2lzLWFuaW1hdGluZycsXG4gICAgSVNfVklTSUJMRTogJ2lzLXZpc2libGUnXG59O1xuLyoqXG4gICAqIEhhbmRsZSBtb3VzZSAvIGZpbmdlciBkb3duIG9uIGVsZW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IFRoZSBldmVudCB0aGF0IGZpcmVkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbk1hdGVyaWFsUmlwcGxlLnByb3RvdHlwZS5kb3duSGFuZGxlcl8gPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBpZiAoIXRoaXMucmlwcGxlRWxlbWVudF8uc3R5bGUud2lkdGggJiYgIXRoaXMucmlwcGxlRWxlbWVudF8uc3R5bGUuaGVpZ2h0KSB7XG4gICAgICAgIHZhciByZWN0ID0gdGhpcy5lbGVtZW50Xy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgdGhpcy5ib3VuZEhlaWdodCA9IHJlY3QuaGVpZ2h0O1xuICAgICAgICB0aGlzLmJvdW5kV2lkdGggPSByZWN0LndpZHRoO1xuICAgICAgICB0aGlzLnJpcHBsZVNpemVfID0gTWF0aC5zcXJ0KHJlY3Qud2lkdGggKiByZWN0LndpZHRoICsgcmVjdC5oZWlnaHQgKiByZWN0LmhlaWdodCkgKiAyICsgMjtcbiAgICAgICAgdGhpcy5yaXBwbGVFbGVtZW50Xy5zdHlsZS53aWR0aCA9IHRoaXMucmlwcGxlU2l6ZV8gKyAncHgnO1xuICAgICAgICB0aGlzLnJpcHBsZUVsZW1lbnRfLnN0eWxlLmhlaWdodCA9IHRoaXMucmlwcGxlU2l6ZV8gKyAncHgnO1xuICAgIH1cbiAgICB0aGlzLnJpcHBsZUVsZW1lbnRfLmNsYXNzTGlzdC5hZGQodGhpcy5Dc3NDbGFzc2VzXy5JU19WSVNJQkxFKTtcbiAgICBpZiAoZXZlbnQudHlwZSA9PT0gJ21vdXNlZG93bicgJiYgdGhpcy5pZ25vcmluZ01vdXNlRG93bl8pIHtcbiAgICAgICAgdGhpcy5pZ25vcmluZ01vdXNlRG93bl8gPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gJ3RvdWNoc3RhcnQnKSB7XG4gICAgICAgICAgICB0aGlzLmlnbm9yaW5nTW91c2VEb3duXyA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGZyYW1lQ291bnQgPSB0aGlzLmdldEZyYW1lQ291bnQoKTtcbiAgICAgICAgaWYgKGZyYW1lQ291bnQgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zZXRGcmFtZUNvdW50KDEpO1xuICAgICAgICB2YXIgYm91bmQgPSBldmVudC5jdXJyZW50VGFyZ2V0LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICB2YXIgeDtcbiAgICAgICAgdmFyIHk7XG4gICAgICAgIC8vIENoZWNrIGlmIHdlIGFyZSBoYW5kbGluZyBhIGtleWJvYXJkIGNsaWNrLlxuICAgICAgICBpZiAoZXZlbnQuY2xpZW50WCA9PT0gMCAmJiBldmVudC5jbGllbnRZID09PSAwKSB7XG4gICAgICAgICAgICB4ID0gTWF0aC5yb3VuZChib3VuZC53aWR0aCAvIDIpO1xuICAgICAgICAgICAgeSA9IE1hdGgucm91bmQoYm91bmQuaGVpZ2h0IC8gMik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgY2xpZW50WCA9IGV2ZW50LmNsaWVudFggPyBldmVudC5jbGllbnRYIDogZXZlbnQudG91Y2hlc1swXS5jbGllbnRYO1xuICAgICAgICAgICAgdmFyIGNsaWVudFkgPSBldmVudC5jbGllbnRZID8gZXZlbnQuY2xpZW50WSA6IGV2ZW50LnRvdWNoZXNbMF0uY2xpZW50WTtcbiAgICAgICAgICAgIHggPSBNYXRoLnJvdW5kKGNsaWVudFggLSBib3VuZC5sZWZ0KTtcbiAgICAgICAgICAgIHkgPSBNYXRoLnJvdW5kKGNsaWVudFkgLSBib3VuZC50b3ApO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc2V0UmlwcGxlWFkoeCwgeSk7XG4gICAgICAgIHRoaXMuc2V0UmlwcGxlU3R5bGVzKHRydWUpO1xuICAgICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMuYW5pbUZyYW1lSGFuZGxlci5iaW5kKHRoaXMpKTtcbiAgICB9XG59O1xuLyoqXG4gICAqIEhhbmRsZSBtb3VzZSAvIGZpbmdlciB1cCBvbiBlbGVtZW50LlxuICAgKlxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudCBUaGUgZXZlbnQgdGhhdCBmaXJlZC5cbiAgICogQHByaXZhdGVcbiAgICovXG5NYXRlcmlhbFJpcHBsZS5wcm90b3R5cGUudXBIYW5kbGVyXyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIC8vIERvbid0IGZpcmUgZm9yIHRoZSBhcnRpZmljaWFsIFwibW91c2V1cFwiIGdlbmVyYXRlZCBieSBhIGRvdWJsZS1jbGljay5cbiAgICBpZiAoZXZlbnQgJiYgZXZlbnQuZGV0YWlsICE9PSAyKSB7XG4gICAgICAgIC8vIEFsbG93IGEgcmVwYWludCB0byBvY2N1ciBiZWZvcmUgcmVtb3ZpbmcgdGhpcyBjbGFzcywgc28gdGhlIGFuaW1hdGlvblxuICAgICAgICAvLyBzaG93cyBmb3IgdGFwIGV2ZW50cywgd2hpY2ggc2VlbSB0byB0cmlnZ2VyIGEgbW91c2V1cCB0b28gc29vbiBhZnRlclxuICAgICAgICAvLyBtb3VzZWRvd24uXG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMucmlwcGxlRWxlbWVudF8uY2xhc3NMaXN0LnJlbW92ZSh0aGlzLkNzc0NsYXNzZXNfLklTX1ZJU0lCTEUpO1xuICAgICAgICB9LmJpbmQodGhpcyksIDApO1xuICAgIH1cbn07XG4vKipcbiAgICogSW5pdGlhbGl6ZSBlbGVtZW50LlxuICAgKi9cbk1hdGVyaWFsUmlwcGxlLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmVsZW1lbnRfKSB7XG4gICAgICAgIHZhciByZWNlbnRlcmluZyA9IHRoaXMuZWxlbWVudF8uY2xhc3NMaXN0LmNvbnRhaW5zKHRoaXMuQ3NzQ2xhc3Nlc18uUklQUExFX0NFTlRFUik7XG4gICAgICAgIGlmICghdGhpcy5lbGVtZW50Xy5jbGFzc0xpc3QuY29udGFpbnModGhpcy5Dc3NDbGFzc2VzXy5SSVBQTEVfRUZGRUNUX0lHTk9SRV9FVkVOVFMpKSB7XG4gICAgICAgICAgICB0aGlzLnJpcHBsZUVsZW1lbnRfID0gdGhpcy5lbGVtZW50Xy5xdWVyeVNlbGVjdG9yKCcuJyArIHRoaXMuQ3NzQ2xhc3Nlc18uUklQUExFKTtcbiAgICAgICAgICAgIHRoaXMuZnJhbWVDb3VudF8gPSAwO1xuICAgICAgICAgICAgdGhpcy5yaXBwbGVTaXplXyA9IDA7XG4gICAgICAgICAgICB0aGlzLnhfID0gMDtcbiAgICAgICAgICAgIHRoaXMueV8gPSAwO1xuICAgICAgICAgICAgLy8gVG91Y2ggc3RhcnQgcHJvZHVjZXMgYSBjb21wYXQgbW91c2UgZG93biBldmVudCwgd2hpY2ggd291bGQgY2F1c2UgYVxuICAgICAgICAgICAgLy8gc2Vjb25kIHJpcHBsZXMuIFRvIGF2b2lkIHRoYXQsIHdlIHVzZSB0aGlzIHByb3BlcnR5IHRvIGlnbm9yZSB0aGUgZmlyc3RcbiAgICAgICAgICAgIC8vIG1vdXNlIGRvd24gYWZ0ZXIgYSB0b3VjaCBzdGFydC5cbiAgICAgICAgICAgIHRoaXMuaWdub3JpbmdNb3VzZURvd25fID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLmJvdW5kRG93bkhhbmRsZXIgPSB0aGlzLmRvd25IYW5kbGVyXy5iaW5kKHRoaXMpO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50Xy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCB0aGlzLmJvdW5kRG93bkhhbmRsZXIpO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50Xy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0JywgdGhpcy5ib3VuZERvd25IYW5kbGVyKTtcbiAgICAgICAgICAgIHRoaXMuYm91bmRVcEhhbmRsZXIgPSB0aGlzLnVwSGFuZGxlcl8uYmluZCh0aGlzKTtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudF8uYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuYm91bmRVcEhhbmRsZXIpO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50Xy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWxlYXZlJywgdGhpcy5ib3VuZFVwSGFuZGxlcik7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRfLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgdGhpcy5ib3VuZFVwSGFuZGxlcik7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRfLmFkZEV2ZW50TGlzdGVuZXIoJ2JsdXInLCB0aGlzLmJvdW5kVXBIYW5kbGVyKTtcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgKiBHZXR0ZXIgZm9yIGZyYW1lQ291bnRfLlxuICAgICAgICAgKiBAcmV0dXJuIHtudW1iZXJ9IHRoZSBmcmFtZSBjb3VudC5cbiAgICAgICAgICovXG4gICAgICAgICAgICB0aGlzLmdldEZyYW1lQ291bnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZnJhbWVDb3VudF87XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgLyoqXG4gICAgICAgICAqIFNldHRlciBmb3IgZnJhbWVDb3VudF8uXG4gICAgICAgICAqIEBwYXJhbSB7bnVtYmVyfSBmQyB0aGUgZnJhbWUgY291bnQuXG4gICAgICAgICAqL1xuICAgICAgICAgICAgdGhpcy5zZXRGcmFtZUNvdW50ID0gZnVuY3Rpb24gKGZDKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5mcmFtZUNvdW50XyA9IGZDO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgKiBHZXR0ZXIgZm9yIHJpcHBsZUVsZW1lbnRfLlxuICAgICAgICAgKiBAcmV0dXJuIHtFbGVtZW50fSB0aGUgcmlwcGxlIGVsZW1lbnQuXG4gICAgICAgICAqL1xuICAgICAgICAgICAgdGhpcy5nZXRSaXBwbGVFbGVtZW50ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnJpcHBsZUVsZW1lbnRfO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgKiBTZXRzIHRoZSByaXBwbGUgWCBhbmQgWSBjb29yZGluYXRlcy5cbiAgICAgICAgICogQHBhcmFtICB7bnVtYmVyfSBuZXdYIHRoZSBuZXcgWCBjb29yZGluYXRlXG4gICAgICAgICAqIEBwYXJhbSAge251bWJlcn0gbmV3WSB0aGUgbmV3IFkgY29vcmRpbmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgICAgIHRoaXMuc2V0UmlwcGxlWFkgPSBmdW5jdGlvbiAobmV3WCwgbmV3WSkge1xuICAgICAgICAgICAgICAgIHRoaXMueF8gPSBuZXdYO1xuICAgICAgICAgICAgICAgIHRoaXMueV8gPSBuZXdZO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgKiBTZXRzIHRoZSByaXBwbGUgc3R5bGVzLlxuICAgICAgICAgKiBAcGFyYW0gIHtib29sZWFufSBzdGFydCB3aGV0aGVyIG9yIG5vdCB0aGlzIGlzIHRoZSBzdGFydCBmcmFtZS5cbiAgICAgICAgICovXG4gICAgICAgICAgICB0aGlzLnNldFJpcHBsZVN0eWxlcyA9IGZ1bmN0aW9uIChzdGFydCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnJpcHBsZUVsZW1lbnRfICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0cmFuc2Zvcm1TdHJpbmc7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzY2FsZTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNpemU7XG4gICAgICAgICAgICAgICAgICAgIHZhciBvZmZzZXQgPSAndHJhbnNsYXRlKCcgKyB0aGlzLnhfICsgJ3B4LCAnICsgdGhpcy55XyArICdweCknO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RhcnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjYWxlID0gdGhpcy5Db25zdGFudF8uSU5JVElBTF9TQ0FMRTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpemUgPSB0aGlzLkNvbnN0YW50Xy5JTklUSUFMX1NJWkU7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2FsZSA9IHRoaXMuQ29uc3RhbnRfLkZJTkFMX1NDQUxFO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZSA9IHRoaXMucmlwcGxlU2l6ZV8gKyAncHgnO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlY2VudGVyaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2Zmc2V0ID0gJ3RyYW5zbGF0ZSgnICsgdGhpcy5ib3VuZFdpZHRoIC8gMiArICdweCwgJyArIHRoaXMuYm91bmRIZWlnaHQgLyAyICsgJ3B4KSc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdHJhbnNmb3JtU3RyaW5nID0gJ3RyYW5zbGF0ZSgtNTAlLCAtNTAlKSAnICsgb2Zmc2V0ICsgc2NhbGU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmlwcGxlRWxlbWVudF8uc3R5bGUud2Via2l0VHJhbnNmb3JtID0gdHJhbnNmb3JtU3RyaW5nO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJpcHBsZUVsZW1lbnRfLnN0eWxlLm1zVHJhbnNmb3JtID0gdHJhbnNmb3JtU3RyaW5nO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJpcHBsZUVsZW1lbnRfLnN0eWxlLnRyYW5zZm9ybSA9IHRyYW5zZm9ybVN0cmluZztcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXJ0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJpcHBsZUVsZW1lbnRfLmNsYXNzTGlzdC5yZW1vdmUodGhpcy5Dc3NDbGFzc2VzXy5JU19BTklNQVRJTkcpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yaXBwbGVFbGVtZW50Xy5jbGFzc0xpc3QuYWRkKHRoaXMuQ3NzQ2xhc3Nlc18uSVNfQU5JTUFUSU5HKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAvKipcbiAgICAgICAgICogSGFuZGxlcyBhbiBhbmltYXRpb24gZnJhbWUuXG4gICAgICAgICAqL1xuICAgICAgICAgICAgdGhpcy5hbmltRnJhbWVIYW5kbGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmZyYW1lQ291bnRfLS0gPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy5hbmltRnJhbWVIYW5kbGVyLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0UmlwcGxlU3R5bGVzKGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxufTtcbi8vIFRoZSBjb21wb25lbnQgcmVnaXN0ZXJzIGl0c2VsZi4gSXQgY2FuIGFzc3VtZSBjb21wb25lbnRIYW5kbGVyIGlzIGF2YWlsYWJsZVxuLy8gaW4gdGhlIGdsb2JhbCBzY29wZS5cbmNvbXBvbmVudEhhbmRsZXIucmVnaXN0ZXIoe1xuICAgIGNvbnN0cnVjdG9yOiBNYXRlcmlhbFJpcHBsZSxcbiAgICBjbGFzc0FzU3RyaW5nOiAnTWF0ZXJpYWxSaXBwbGUnLFxuICAgIGNzc0NsYXNzOiAnbWRsLWpzLXJpcHBsZS1lZmZlY3QnLFxuICAgIHdpZGdldDogZmFsc2Vcbn0pO1xufSgpKTtcbiIsIihmdW5jdGlvbigpIHtcblxuICB2YXIgc3VwcG9ydEN1c3RvbUV2ZW50ID0gd2luZG93LkN1c3RvbUV2ZW50O1xuICBpZiAoIXN1cHBvcnRDdXN0b21FdmVudCB8fCB0eXBlb2Ygc3VwcG9ydEN1c3RvbUV2ZW50ID09ICdvYmplY3QnKSB7XG4gICAgc3VwcG9ydEN1c3RvbUV2ZW50ID0gZnVuY3Rpb24gQ3VzdG9tRXZlbnQoZXZlbnQsIHgpIHtcbiAgICAgIHggPSB4IHx8IHt9O1xuICAgICAgdmFyIGV2ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0N1c3RvbUV2ZW50Jyk7XG4gICAgICBldi5pbml0Q3VzdG9tRXZlbnQoZXZlbnQsICEheC5idWJibGVzLCAhIXguY2FuY2VsYWJsZSwgeC5kZXRhaWwgfHwgbnVsbCk7XG4gICAgICByZXR1cm4gZXY7XG4gICAgfTtcbiAgICBzdXBwb3J0Q3VzdG9tRXZlbnQucHJvdG90eXBlID0gd2luZG93LkV2ZW50LnByb3RvdHlwZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kcyB0aGUgbmVhcmVzdCA8ZGlhbG9nPiBmcm9tIHRoZSBwYXNzZWQgZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtFbGVtZW50fSBlbCB0byBzZWFyY2ggZnJvbVxuICAgKiBAcmV0dXJuIHtIVE1MRGlhbG9nRWxlbWVudH0gZGlhbG9nIGZvdW5kXG4gICAqL1xuICBmdW5jdGlvbiBmaW5kTmVhcmVzdERpYWxvZyhlbCkge1xuICAgIHdoaWxlIChlbCkge1xuICAgICAgaWYgKGVsLm5vZGVOYW1lLnRvVXBwZXJDYXNlKCkgPT0gJ0RJQUxPRycpIHtcbiAgICAgICAgcmV0dXJuIC8qKiBAdHlwZSB7SFRNTERpYWxvZ0VsZW1lbnR9ICovIChlbCk7XG4gICAgICB9XG4gICAgICBlbCA9IGVsLnBhcmVudEVsZW1lbnQ7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEJsdXIgdGhlIHNwZWNpZmllZCBlbGVtZW50LCBhcyBsb25nIGFzIGl0J3Mgbm90IHRoZSBIVE1MIGJvZHkgZWxlbWVudC5cbiAgICogVGhpcyB3b3JrcyBhcm91bmQgYW4gSUU5LzEwIGJ1ZyAtIGJsdXJyaW5nIHRoZSBib2R5IGNhdXNlcyBXaW5kb3dzIHRvXG4gICAqIGJsdXIgdGhlIHdob2xlIGFwcGxpY2F0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0ge0VsZW1lbnR9IGVsIHRvIGJsdXJcbiAgICovXG4gIGZ1bmN0aW9uIHNhZmVCbHVyKGVsKSB7XG4gICAgaWYgKGVsICYmIGVsLmJsdXIgJiYgZWwgIT0gZG9jdW1lbnQuYm9keSkge1xuICAgICAgZWwuYmx1cigpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcGFyYW0geyFOb2RlTGlzdH0gbm9kZUxpc3QgdG8gc2VhcmNoXG4gICAqIEBwYXJhbSB7Tm9kZX0gbm9kZSB0byBmaW5kXG4gICAqIEByZXR1cm4ge2Jvb2xlYW59IHdoZXRoZXIgbm9kZSBpcyBpbnNpZGUgbm9kZUxpc3RcbiAgICovXG4gIGZ1bmN0aW9uIGluTm9kZUxpc3Qobm9kZUxpc3QsIG5vZGUpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVMaXN0Lmxlbmd0aDsgKytpKSB7XG4gICAgICBpZiAobm9kZUxpc3RbaV0gPT0gbm9kZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7IUhUTUxEaWFsb2dFbGVtZW50fSBkaWFsb2cgdG8gdXBncmFkZVxuICAgKiBAY29uc3RydWN0b3JcbiAgICovXG4gIGZ1bmN0aW9uIGRpYWxvZ1BvbHlmaWxsSW5mbyhkaWFsb2cpIHtcbiAgICB0aGlzLmRpYWxvZ18gPSBkaWFsb2c7XG4gICAgdGhpcy5yZXBsYWNlZFN0eWxlVG9wXyA9IGZhbHNlO1xuICAgIHRoaXMub3BlbkFzTW9kYWxfID0gZmFsc2U7XG5cbiAgICAvLyBTZXQgYTExeSByb2xlLiBCcm93c2VycyB0aGF0IHN1cHBvcnQgZGlhbG9nIGltcGxpY2l0bHkga25vdyB0aGlzIGFscmVhZHkuXG4gICAgaWYgKCFkaWFsb2cuaGFzQXR0cmlidXRlKCdyb2xlJykpIHtcbiAgICAgIGRpYWxvZy5zZXRBdHRyaWJ1dGUoJ3JvbGUnLCAnZGlhbG9nJyk7XG4gICAgfVxuXG4gICAgZGlhbG9nLnNob3cgPSB0aGlzLnNob3cuYmluZCh0aGlzKTtcbiAgICBkaWFsb2cuc2hvd01vZGFsID0gdGhpcy5zaG93TW9kYWwuYmluZCh0aGlzKTtcbiAgICBkaWFsb2cuY2xvc2UgPSB0aGlzLmNsb3NlLmJpbmQodGhpcyk7XG5cbiAgICBpZiAoISgncmV0dXJuVmFsdWUnIGluIGRpYWxvZykpIHtcbiAgICAgIGRpYWxvZy5yZXR1cm5WYWx1ZSA9ICcnO1xuICAgIH1cblxuICAgIHRoaXMubWF5YmVIaWRlTW9kYWwgPSB0aGlzLm1heWJlSGlkZU1vZGFsLmJpbmQodGhpcyk7XG4gICAgaWYgKCdNdXRhdGlvbk9ic2VydmVyJyBpbiB3aW5kb3cpIHtcbiAgICAgIC8vIElFMTErLCBtb3N0IG90aGVyIGJyb3dzZXJzLlxuICAgICAgdmFyIG1vID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIodGhpcy5tYXliZUhpZGVNb2RhbCk7XG4gICAgICBtby5vYnNlcnZlKGRpYWxvZywgeyBhdHRyaWJ1dGVzOiB0cnVlLCBhdHRyaWJ1dGVGaWx0ZXI6IFsnb3BlbiddIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBkaWFsb2cuYWRkRXZlbnRMaXN0ZW5lcignRE9NQXR0ck1vZGlmaWVkJywgdGhpcy5tYXliZUhpZGVNb2RhbCk7XG4gICAgfVxuICAgIC8vIE5vdGUgdGhhdCB0aGUgRE9NIGlzIG9ic2VydmVkIGluc2lkZSBEaWFsb2dNYW5hZ2VyIHdoaWxlIGFueSBkaWFsb2dcbiAgICAvLyBpcyBiZWluZyBkaXNwbGF5ZWQgYXMgYSBtb2RhbCwgdG8gY2F0Y2ggbW9kYWwgcmVtb3ZhbCBmcm9tIHRoZSBET00uXG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZGlhbG9nLCAnb3BlbicsIHtcbiAgICAgIHNldDogdGhpcy5zZXRPcGVuLmJpbmQodGhpcyksXG4gICAgICBnZXQ6IGRpYWxvZy5oYXNBdHRyaWJ1dGUuYmluZChkaWFsb2csICdvcGVuJylcbiAgICB9KTtcblxuICAgIHRoaXMuYmFja2Ryb3BfID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdGhpcy5iYWNrZHJvcF8uY2xhc3NOYW1lID0gJ2JhY2tkcm9wJztcbiAgICB0aGlzLmJhY2tkcm9wQ2xpY2tfID0gdGhpcy5iYWNrZHJvcENsaWNrXy5iaW5kKHRoaXMpO1xuICB9XG5cbiAgZGlhbG9nUG9seWZpbGxJbmZvLnByb3RvdHlwZSA9IHtcblxuICAgIGdldCBkaWFsb2coKSB7XG4gICAgICByZXR1cm4gdGhpcy5kaWFsb2dfO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBNYXliZSByZW1vdmUgdGhpcyBkaWFsb2cgZnJvbSB0aGUgbW9kYWwgdG9wIGxheWVyLiBUaGlzIGlzIGNhbGxlZCB3aGVuXG4gICAgICogYSBtb2RhbCBkaWFsb2cgbWF5IG5vIGxvbmdlciBiZSB0ZW5hYmxlLCBlLmcuLCB3aGVuIHRoZSBkaWFsb2cgaXMgbm9cbiAgICAgKiBsb25nZXIgb3BlbiBvciBpcyBubyBsb25nZXIgcGFydCBvZiB0aGUgRE9NLlxuICAgICAqL1xuICAgIG1heWJlSGlkZU1vZGFsOiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICghdGhpcy5vcGVuQXNNb2RhbF8pIHsgcmV0dXJuOyB9XG4gICAgICBpZiAodGhpcy5kaWFsb2dfLmhhc0F0dHJpYnV0ZSgnb3BlbicpICYmXG4gICAgICAgICAgZG9jdW1lbnQuYm9keS5jb250YWlucyh0aGlzLmRpYWxvZ18pKSB7IHJldHVybjsgfVxuXG4gICAgICB0aGlzLm9wZW5Bc01vZGFsXyA9IGZhbHNlO1xuICAgICAgdGhpcy5kaWFsb2dfLnN0eWxlLnpJbmRleCA9ICcnO1xuXG4gICAgICAvLyBUaGlzIHdvbid0IG1hdGNoIHRoZSBuYXRpdmUgPGRpYWxvZz4gZXhhY3RseSBiZWNhdXNlIGlmIHRoZSB1c2VyIHNldFxuICAgICAgLy8gdG9wIG9uIGEgY2VudGVyZWQgcG9seWZpbGwgZGlhbG9nLCB0aGF0IHRvcCBnZXRzIHRocm93biBhd2F5IHdoZW4gdGhlXG4gICAgICAvLyBkaWFsb2cgaXMgY2xvc2VkLiBOb3Qgc3VyZSBpdCdzIHBvc3NpYmxlIHRvIHBvbHlmaWxsIHRoaXMgcGVyZmVjdGx5LlxuICAgICAgaWYgKHRoaXMucmVwbGFjZWRTdHlsZVRvcF8pIHtcbiAgICAgICAgdGhpcy5kaWFsb2dfLnN0eWxlLnRvcCA9ICcnO1xuICAgICAgICB0aGlzLnJlcGxhY2VkU3R5bGVUb3BfID0gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIC8vIE9wdGltaXN0aWNhbGx5IGNsZWFyIHRoZSBtb2RhbCBwYXJ0IG9mIHRoaXMgPGRpYWxvZz4uXG4gICAgICB0aGlzLmJhY2tkcm9wXy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuYmFja2Ryb3BDbGlja18pO1xuICAgICAgaWYgKHRoaXMuYmFja2Ryb3BfLnBhcmVudEVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy5iYWNrZHJvcF8ucGFyZW50RWxlbWVudC5yZW1vdmVDaGlsZCh0aGlzLmJhY2tkcm9wXyk7XG4gICAgICB9XG4gICAgICBkaWFsb2dQb2x5ZmlsbC5kbS5yZW1vdmVEaWFsb2codGhpcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gdmFsdWUgd2hldGhlciB0byBvcGVuIG9yIGNsb3NlIHRoaXMgZGlhbG9nXG4gICAgICovXG4gICAgc2V0T3BlbjogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICB0aGlzLmRpYWxvZ18uaGFzQXR0cmlidXRlKCdvcGVuJykgfHwgdGhpcy5kaWFsb2dfLnNldEF0dHJpYnV0ZSgnb3BlbicsICcnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZGlhbG9nXy5yZW1vdmVBdHRyaWJ1dGUoJ29wZW4nKTtcbiAgICAgICAgdGhpcy5tYXliZUhpZGVNb2RhbCgpOyAgLy8gbmIuIHJlZHVuZGFudCB3aXRoIE11dGF0aW9uT2JzZXJ2ZXJcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyBjbGlja3Mgb24gdGhlIGZha2UgLmJhY2tkcm9wIGVsZW1lbnQsIHJlZGlyZWN0aW5nIHRoZW0gYXMgaWZcbiAgICAgKiB0aGV5IHdlcmUgb24gdGhlIGRpYWxvZyBpdHNlbGYuXG4gICAgICpcbiAgICAgKiBAcGFyYW0geyFFdmVudH0gZSB0byByZWRpcmVjdFxuICAgICAqL1xuICAgIGJhY2tkcm9wQ2xpY2tfOiBmdW5jdGlvbihlKSB7XG4gICAgICB2YXIgcmVkaXJlY3RlZEV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ01vdXNlRXZlbnRzJyk7XG4gICAgICByZWRpcmVjdGVkRXZlbnQuaW5pdE1vdXNlRXZlbnQoZS50eXBlLCBlLmJ1YmJsZXMsIGUuY2FuY2VsYWJsZSwgd2luZG93LFxuICAgICAgICAgIGUuZGV0YWlsLCBlLnNjcmVlblgsIGUuc2NyZWVuWSwgZS5jbGllbnRYLCBlLmNsaWVudFksIGUuY3RybEtleSxcbiAgICAgICAgICBlLmFsdEtleSwgZS5zaGlmdEtleSwgZS5tZXRhS2V5LCBlLmJ1dHRvbiwgZS5yZWxhdGVkVGFyZ2V0KTtcbiAgICAgIHRoaXMuZGlhbG9nXy5kaXNwYXRjaEV2ZW50KHJlZGlyZWN0ZWRFdmVudCk7XG4gICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSB6SW5kZXggZm9yIHRoZSBiYWNrZHJvcCBhbmQgZGlhbG9nLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGJhY2tkcm9wWlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkaWFsb2daXG4gICAgICovXG4gICAgdXBkYXRlWkluZGV4OiBmdW5jdGlvbihiYWNrZHJvcFosIGRpYWxvZ1opIHtcbiAgICAgIHRoaXMuYmFja2Ryb3BfLnN0eWxlLnpJbmRleCA9IGJhY2tkcm9wWjtcbiAgICAgIHRoaXMuZGlhbG9nXy5zdHlsZS56SW5kZXggPSBkaWFsb2daO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93cyB0aGUgZGlhbG9nLiBUaGlzIGlzIGlkZW1wb3RlbnQgYW5kIHdpbGwgYWx3YXlzIHN1Y2NlZWQuXG4gICAgICovXG4gICAgc2hvdzogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLnNldE9wZW4odHJ1ZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3cgdGhpcyBkaWFsb2cgbW9kYWxseS5cbiAgICAgKi9cbiAgICBzaG93TW9kYWw6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHRoaXMuZGlhbG9nXy5oYXNBdHRyaWJ1dGUoJ29wZW4nKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBleGVjdXRlIFxcJ3Nob3dNb2RhbFxcJyBvbiBkaWFsb2c6IFRoZSBlbGVtZW50IGlzIGFscmVhZHkgb3BlbiwgYW5kIHRoZXJlZm9yZSBjYW5ub3QgYmUgb3BlbmVkIG1vZGFsbHkuJyk7XG4gICAgICB9XG4gICAgICBpZiAoIWRvY3VtZW50LmJvZHkuY29udGFpbnModGhpcy5kaWFsb2dfKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBleGVjdXRlIFxcJ3Nob3dNb2RhbFxcJyBvbiBkaWFsb2c6IFRoZSBlbGVtZW50IGlzIG5vdCBpbiBhIERvY3VtZW50LicpO1xuICAgICAgfVxuICAgICAgaWYgKCFkaWFsb2dQb2x5ZmlsbC5kbS5wdXNoRGlhbG9nKHRoaXMpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGV4ZWN1dGUgXFwnc2hvd01vZGFsXFwnIG9uIGRpYWxvZzogVGhlcmUgYXJlIHRvbyBtYW55IG9wZW4gbW9kYWwgZGlhbG9ncy4nKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuc2hvdygpO1xuICAgICAgdGhpcy5vcGVuQXNNb2RhbF8gPSB0cnVlO1xuXG4gICAgICAvLyBPcHRpb25hbGx5IGNlbnRlciB2ZXJ0aWNhbGx5LCByZWxhdGl2ZSB0byB0aGUgY3VycmVudCB2aWV3cG9ydC5cbiAgICAgIGlmIChkaWFsb2dQb2x5ZmlsbC5uZWVkc0NlbnRlcmluZyh0aGlzLmRpYWxvZ18pKSB7XG4gICAgICAgIGRpYWxvZ1BvbHlmaWxsLnJlcG9zaXRpb24odGhpcy5kaWFsb2dfKTtcbiAgICAgICAgdGhpcy5yZXBsYWNlZFN0eWxlVG9wXyA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnJlcGxhY2VkU3R5bGVUb3BfID0gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIC8vIEluc2VydCBiYWNrZHJvcC5cbiAgICAgIHRoaXMuYmFja2Ryb3BfLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5iYWNrZHJvcENsaWNrXyk7XG4gICAgICB0aGlzLmRpYWxvZ18ucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5iYWNrZHJvcF8sXG4gICAgICAgICAgdGhpcy5kaWFsb2dfLm5leHRTaWJsaW5nKTtcblxuICAgICAgLy8gRmluZCBlbGVtZW50IHdpdGggYGF1dG9mb2N1c2AgYXR0cmlidXRlIG9yIGZpcnN0IGZvcm0gY29udHJvbC5cbiAgICAgIHZhciB0YXJnZXQgPSB0aGlzLmRpYWxvZ18ucXVlcnlTZWxlY3RvcignW2F1dG9mb2N1c106bm90KFtkaXNhYmxlZF0pJyk7XG4gICAgICBpZiAoIXRhcmdldCkge1xuICAgICAgICAvLyBUT0RPOiB0ZWNobmljYWxseSB0aGlzIGlzICdhbnkgZm9jdXNhYmxlIGFyZWEnXG4gICAgICAgIHZhciBvcHRzID0gWydidXR0b24nLCAnaW5wdXQnLCAna2V5Z2VuJywgJ3NlbGVjdCcsICd0ZXh0YXJlYSddO1xuICAgICAgICB2YXIgcXVlcnkgPSBvcHRzLm1hcChmdW5jdGlvbihlbCkge1xuICAgICAgICAgIHJldHVybiBlbCArICc6bm90KFtkaXNhYmxlZF0pJztcbiAgICAgICAgfSkuam9pbignLCAnKTtcbiAgICAgICAgdGFyZ2V0ID0gdGhpcy5kaWFsb2dfLnF1ZXJ5U2VsZWN0b3IocXVlcnkpO1xuICAgICAgfVxuICAgICAgc2FmZUJsdXIoZG9jdW1lbnQuYWN0aXZlRWxlbWVudCk7XG4gICAgICB0YXJnZXQgJiYgdGFyZ2V0LmZvY3VzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsb3NlcyB0aGlzIEhUTUxEaWFsb2dFbGVtZW50LiBUaGlzIGlzIG9wdGlvbmFsIHZzIGNsZWFyaW5nIHRoZSBvcGVuXG4gICAgICogYXR0cmlidXRlLCBob3dldmVyIHRoaXMgZmlyZXMgYSAnY2xvc2UnIGV2ZW50LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmc9fSBvcHRfcmV0dXJuVmFsdWUgdG8gdXNlIGFzIHRoZSByZXR1cm5WYWx1ZVxuICAgICAqL1xuICAgIGNsb3NlOiBmdW5jdGlvbihvcHRfcmV0dXJuVmFsdWUpIHtcbiAgICAgIGlmICghdGhpcy5kaWFsb2dfLmhhc0F0dHJpYnV0ZSgnb3BlbicpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGV4ZWN1dGUgXFwnY2xvc2VcXCcgb24gZGlhbG9nOiBUaGUgZWxlbWVudCBkb2VzIG5vdCBoYXZlIGFuIFxcJ29wZW5cXCcgYXR0cmlidXRlLCBhbmQgdGhlcmVmb3JlIGNhbm5vdCBiZSBjbG9zZWQuJyk7XG4gICAgICB9XG4gICAgICB0aGlzLnNldE9wZW4oZmFsc2UpO1xuXG4gICAgICAvLyBMZWF2ZSByZXR1cm5WYWx1ZSB1bnRvdWNoZWQgaW4gY2FzZSBpdCB3YXMgc2V0IGRpcmVjdGx5IG9uIHRoZSBlbGVtZW50XG4gICAgICBpZiAob3B0X3JldHVyblZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5kaWFsb2dfLnJldHVyblZhbHVlID0gb3B0X3JldHVyblZhbHVlO1xuICAgICAgfVxuXG4gICAgICAvLyBUcmlnZ2VyaW5nIFwiY2xvc2VcIiBldmVudCBmb3IgYW55IGF0dGFjaGVkIGxpc3RlbmVycyBvbiB0aGUgPGRpYWxvZz4uXG4gICAgICB2YXIgY2xvc2VFdmVudCA9IG5ldyBzdXBwb3J0Q3VzdG9tRXZlbnQoJ2Nsb3NlJywge1xuICAgICAgICBidWJibGVzOiBmYWxzZSxcbiAgICAgICAgY2FuY2VsYWJsZTogZmFsc2VcbiAgICAgIH0pO1xuICAgICAgdGhpcy5kaWFsb2dfLmRpc3BhdGNoRXZlbnQoY2xvc2VFdmVudCk7XG4gICAgfVxuXG4gIH07XG5cbiAgdmFyIGRpYWxvZ1BvbHlmaWxsID0ge307XG5cbiAgZGlhbG9nUG9seWZpbGwucmVwb3NpdGlvbiA9IGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgICB2YXIgc2Nyb2xsVG9wID0gZG9jdW1lbnQuYm9keS5zY3JvbGxUb3AgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcDtcbiAgICB2YXIgdG9wVmFsdWUgPSBzY3JvbGxUb3AgKyAod2luZG93LmlubmVySGVpZ2h0IC0gZWxlbWVudC5vZmZzZXRIZWlnaHQpIC8gMjtcbiAgICBlbGVtZW50LnN0eWxlLnRvcCA9IE1hdGgubWF4KHNjcm9sbFRvcCwgdG9wVmFsdWUpICsgJ3B4JztcbiAgfTtcblxuICBkaWFsb2dQb2x5ZmlsbC5pc0lubGluZVBvc2l0aW9uU2V0QnlTdHlsZXNoZWV0ID0gZnVuY3Rpb24oZWxlbWVudCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZG9jdW1lbnQuc3R5bGVTaGVldHMubGVuZ3RoOyArK2kpIHtcbiAgICAgIHZhciBzdHlsZVNoZWV0ID0gZG9jdW1lbnQuc3R5bGVTaGVldHNbaV07XG4gICAgICB2YXIgY3NzUnVsZXMgPSBudWxsO1xuICAgICAgLy8gU29tZSBicm93c2VycyB0aHJvdyBvbiBjc3NSdWxlcy5cbiAgICAgIHRyeSB7XG4gICAgICAgIGNzc1J1bGVzID0gc3R5bGVTaGVldC5jc3NSdWxlcztcbiAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgICBpZiAoIWNzc1J1bGVzKVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgY3NzUnVsZXMubGVuZ3RoOyArK2opIHtcbiAgICAgICAgdmFyIHJ1bGUgPSBjc3NSdWxlc1tqXTtcbiAgICAgICAgdmFyIHNlbGVjdGVkTm9kZXMgPSBudWxsO1xuICAgICAgICAvLyBJZ25vcmUgZXJyb3JzIG9uIGludmFsaWQgc2VsZWN0b3IgdGV4dHMuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgc2VsZWN0ZWROb2RlcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwocnVsZS5zZWxlY3RvclRleHQpO1xuICAgICAgICB9IGNhdGNoKGUpIHt9XG4gICAgICAgIGlmICghc2VsZWN0ZWROb2RlcyB8fCAhaW5Ob2RlTGlzdChzZWxlY3RlZE5vZGVzLCBlbGVtZW50KSlcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgdmFyIGNzc1RvcCA9IHJ1bGUuc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSgndG9wJyk7XG4gICAgICAgIHZhciBjc3NCb3R0b20gPSBydWxlLnN0eWxlLmdldFByb3BlcnR5VmFsdWUoJ2JvdHRvbScpO1xuICAgICAgICBpZiAoKGNzc1RvcCAmJiBjc3NUb3AgIT0gJ2F1dG8nKSB8fCAoY3NzQm90dG9tICYmIGNzc0JvdHRvbSAhPSAnYXV0bycpKVxuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG5cbiAgZGlhbG9nUG9seWZpbGwubmVlZHNDZW50ZXJpbmcgPSBmdW5jdGlvbihkaWFsb2cpIHtcbiAgICB2YXIgY29tcHV0ZWRTdHlsZSA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGRpYWxvZyk7XG4gICAgaWYgKGNvbXB1dGVkU3R5bGUucG9zaXRpb24gIT0gJ2Fic29sdXRlJykge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIFdlIG11c3QgZGV0ZXJtaW5lIHdoZXRoZXIgdGhlIHRvcC9ib3R0b20gc3BlY2lmaWVkIHZhbHVlIGlzIG5vbi1hdXRvLiAgSW5cbiAgICAvLyBXZWJLaXQvQmxpbmssIGNoZWNraW5nIGNvbXB1dGVkU3R5bGUudG9wID09ICdhdXRvJyBpcyBzdWZmaWNpZW50LCBidXRcbiAgICAvLyBGaXJlZm94IHJldHVybnMgdGhlIHVzZWQgdmFsdWUuIFNvIHdlIGRvIHRoaXMgY3JhenkgdGhpbmcgaW5zdGVhZDogY2hlY2tcbiAgICAvLyB0aGUgaW5saW5lIHN0eWxlIGFuZCB0aGVuIGdvIHRocm91Z2ggQ1NTIHJ1bGVzLlxuICAgIGlmICgoZGlhbG9nLnN0eWxlLnRvcCAhPSAnYXV0bycgJiYgZGlhbG9nLnN0eWxlLnRvcCAhPSAnJykgfHxcbiAgICAgICAgKGRpYWxvZy5zdHlsZS5ib3R0b20gIT0gJ2F1dG8nICYmIGRpYWxvZy5zdHlsZS5ib3R0b20gIT0gJycpKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiAhZGlhbG9nUG9seWZpbGwuaXNJbmxpbmVQb3NpdGlvblNldEJ5U3R5bGVzaGVldChkaWFsb2cpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAcGFyYW0geyFFbGVtZW50fSBlbGVtZW50IHRvIGZvcmNlIHVwZ3JhZGVcbiAgICovXG4gIGRpYWxvZ1BvbHlmaWxsLmZvcmNlUmVnaXN0ZXJEaWFsb2cgPSBmdW5jdGlvbihlbGVtZW50KSB7XG4gICAgaWYgKGVsZW1lbnQuc2hvd01vZGFsKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1RoaXMgYnJvd3NlciBhbHJlYWR5IHN1cHBvcnRzIDxkaWFsb2c+LCB0aGUgcG9seWZpbGwgJyArXG4gICAgICAgICAgJ21heSBub3Qgd29yayBjb3JyZWN0bHknLCBlbGVtZW50KTtcbiAgICB9XG4gICAgaWYgKGVsZW1lbnQubm9kZU5hbWUudG9VcHBlckNhc2UoKSAhPSAnRElBTE9HJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gcmVnaXN0ZXIgZGlhbG9nOiBUaGUgZWxlbWVudCBpcyBub3QgYSBkaWFsb2cuJyk7XG4gICAgfVxuICAgIG5ldyBkaWFsb2dQb2x5ZmlsbEluZm8oLyoqIEB0eXBlIHshSFRNTERpYWxvZ0VsZW1lbnR9ICovIChlbGVtZW50KSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7IUVsZW1lbnR9IGVsZW1lbnQgdG8gdXBncmFkZVxuICAgKi9cbiAgZGlhbG9nUG9seWZpbGwucmVnaXN0ZXJEaWFsb2cgPSBmdW5jdGlvbihlbGVtZW50KSB7XG4gICAgaWYgKGVsZW1lbnQuc2hvd01vZGFsKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ0NhblxcJ3QgdXBncmFkZSA8ZGlhbG9nPjogYWxyZWFkeSBzdXBwb3J0ZWQnLCBlbGVtZW50KTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGlhbG9nUG9seWZpbGwuZm9yY2VSZWdpc3RlckRpYWxvZyhlbGVtZW50KTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKi9cbiAgZGlhbG9nUG9seWZpbGwuRGlhbG9nTWFuYWdlciA9IGZ1bmN0aW9uKCkge1xuICAgIC8qKiBAdHlwZSB7IUFycmF5PCFkaWFsb2dQb2x5ZmlsbEluZm8+fSAqL1xuICAgIHRoaXMucGVuZGluZ0RpYWxvZ1N0YWNrID0gW107XG5cbiAgICAvLyBUaGUgb3ZlcmxheSBpcyB1c2VkIHRvIHNpbXVsYXRlIGhvdyBhIG1vZGFsIGRpYWxvZyBibG9ja3MgdGhlIGRvY3VtZW50LlxuICAgIC8vIFRoZSBibG9ja2luZyBkaWFsb2cgaXMgcG9zaXRpb25lZCBvbiB0b3Agb2YgdGhlIG92ZXJsYXksIGFuZCB0aGUgcmVzdCBvZlxuICAgIC8vIHRoZSBkaWFsb2dzIG9uIHRoZSBwZW5kaW5nIGRpYWxvZyBzdGFjayBhcmUgcG9zaXRpb25lZCBiZWxvdyBpdC4gSW4gdGhlXG4gICAgLy8gYWN0dWFsIGltcGxlbWVudGF0aW9uLCB0aGUgbW9kYWwgZGlhbG9nIHN0YWNraW5nIGlzIGNvbnRyb2xsZWQgYnkgdGhlXG4gICAgLy8gdG9wIGxheWVyLCB3aGVyZSB6LWluZGV4IGhhcyBubyBlZmZlY3QuXG4gICAgdGhpcy5vdmVybGF5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdGhpcy5vdmVybGF5LmNsYXNzTmFtZSA9ICdfZGlhbG9nX292ZXJsYXknO1xuICAgIHRoaXMub3ZlcmxheS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgfSk7XG5cbiAgICB0aGlzLmhhbmRsZUtleV8gPSB0aGlzLmhhbmRsZUtleV8uYmluZCh0aGlzKTtcbiAgICB0aGlzLmhhbmRsZUZvY3VzXyA9IHRoaXMuaGFuZGxlRm9jdXNfLmJpbmQodGhpcyk7XG4gICAgdGhpcy5oYW5kbGVSZW1vdmVfID0gdGhpcy5oYW5kbGVSZW1vdmVfLmJpbmQodGhpcyk7XG5cbiAgICB0aGlzLnpJbmRleExvd18gPSAxMDAwMDA7XG4gICAgdGhpcy56SW5kZXhIaWdoXyA9IDEwMDAwMCArIDE1MDtcbiAgfTtcblxuICAvKipcbiAgICogQHJldHVybiB7RWxlbWVudH0gdGhlIHRvcCBIVE1MIGRpYWxvZyBlbGVtZW50LCBpZiBhbnlcbiAgICovXG4gIGRpYWxvZ1BvbHlmaWxsLkRpYWxvZ01hbmFnZXIucHJvdG90eXBlLnRvcERpYWxvZ0VsZW1lbnQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5wZW5kaW5nRGlhbG9nU3RhY2subGVuZ3RoKSB7XG4gICAgICB2YXIgdCA9IHRoaXMucGVuZGluZ0RpYWxvZ1N0YWNrW3RoaXMucGVuZGluZ0RpYWxvZ1N0YWNrLmxlbmd0aCAtIDFdO1xuICAgICAgcmV0dXJuIHQuZGlhbG9nO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfTtcblxuICAvKipcbiAgICogQ2FsbGVkIG9uIHRoZSBmaXJzdCBtb2RhbCBkaWFsb2cgYmVpbmcgc2hvd24uIEFkZHMgdGhlIG92ZXJsYXkgYW5kIHJlbGF0ZWRcbiAgICogaGFuZGxlcnMuXG4gICAqL1xuICBkaWFsb2dQb2x5ZmlsbC5EaWFsb2dNYW5hZ2VyLnByb3RvdHlwZS5ibG9ja0RvY3VtZW50ID0gZnVuY3Rpb24oKSB7XG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLm92ZXJsYXkpO1xuICAgIGRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcignZm9jdXMnLCB0aGlzLmhhbmRsZUZvY3VzXywgdHJ1ZSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIHRoaXMuaGFuZGxlS2V5Xyk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NTm9kZVJlbW92ZWQnLCB0aGlzLmhhbmRsZVJlbW92ZV8pO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDYWxsZWQgb24gdGhlIGZpcnN0IG1vZGFsIGRpYWxvZyBiZWluZyByZW1vdmVkLCBpLmUuLCB3aGVuIG5vIG1vcmUgbW9kYWxcbiAgICogZGlhbG9ncyBhcmUgdmlzaWJsZS5cbiAgICovXG4gIGRpYWxvZ1BvbHlmaWxsLkRpYWxvZ01hbmFnZXIucHJvdG90eXBlLnVuYmxvY2tEb2N1bWVudCA9IGZ1bmN0aW9uKCkge1xuICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQodGhpcy5vdmVybGF5KTtcbiAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgdGhpcy5oYW5kbGVGb2N1c18sIHRydWUpO1xuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCB0aGlzLmhhbmRsZUtleV8pO1xuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ0RPTU5vZGVSZW1vdmVkJywgdGhpcy5oYW5kbGVSZW1vdmVfKTtcbiAgfTtcblxuICBkaWFsb2dQb2x5ZmlsbC5EaWFsb2dNYW5hZ2VyLnByb3RvdHlwZS51cGRhdGVTdGFja2luZyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB6SW5kZXggPSB0aGlzLnpJbmRleExvd187XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMucGVuZGluZ0RpYWxvZ1N0YWNrLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoaSA9PSB0aGlzLnBlbmRpbmdEaWFsb2dTdGFjay5sZW5ndGggLSAxKSB7XG4gICAgICAgIHRoaXMub3ZlcmxheS5zdHlsZS56SW5kZXggPSB6SW5kZXgrKztcbiAgICAgIH1cbiAgICAgIHRoaXMucGVuZGluZ0RpYWxvZ1N0YWNrW2ldLnVwZGF0ZVpJbmRleCh6SW5kZXgrKywgekluZGV4KyspO1xuICAgIH1cbiAgfTtcblxuICBkaWFsb2dQb2x5ZmlsbC5EaWFsb2dNYW5hZ2VyLnByb3RvdHlwZS5oYW5kbGVGb2N1c18gPSBmdW5jdGlvbihldmVudCkge1xuICAgIHZhciBjYW5kaWRhdGUgPSBmaW5kTmVhcmVzdERpYWxvZygvKiogQHR5cGUge0VsZW1lbnR9ICovIChldmVudC50YXJnZXQpKTtcbiAgICBpZiAoY2FuZGlkYXRlICE9IHRoaXMudG9wRGlhbG9nRWxlbWVudCgpKSB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICBzYWZlQmx1cigvKiogQHR5cGUge0VsZW1lbnR9ICovIChldmVudC50YXJnZXQpKTtcbiAgICAgIC8vIFRPRE86IEZvY3VzIG9uIHRoZSBicm93c2VyIGNocm9tZSAoYWthIGRvY3VtZW50KSBvciB0aGUgZGlhbG9nIGl0c2VsZlxuICAgICAgLy8gZGVwZW5kaW5nIG9uIHRoZSB0YWIgZGlyZWN0aW9uLlxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfTtcblxuICBkaWFsb2dQb2x5ZmlsbC5EaWFsb2dNYW5hZ2VyLnByb3RvdHlwZS5oYW5kbGVLZXlfID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICBpZiAoZXZlbnQua2V5Q29kZSA9PSAyNykge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgdmFyIGNhbmNlbEV2ZW50ID0gbmV3IHN1cHBvcnRDdXN0b21FdmVudCgnY2FuY2VsJywge1xuICAgICAgICBidWJibGVzOiBmYWxzZSxcbiAgICAgICAgY2FuY2VsYWJsZTogdHJ1ZVxuICAgICAgfSk7XG4gICAgICB2YXIgZGlhbG9nID0gdGhpcy50b3BEaWFsb2dFbGVtZW50KCk7XG4gICAgICBpZiAoZGlhbG9nLmRpc3BhdGNoRXZlbnQoY2FuY2VsRXZlbnQpKSB7XG4gICAgICAgIGRpYWxvZy5jbG9zZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICBkaWFsb2dQb2x5ZmlsbC5EaWFsb2dNYW5hZ2VyLnByb3RvdHlwZS5oYW5kbGVSZW1vdmVfID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICBpZiAoZXZlbnQudGFyZ2V0Lm5vZGVOYW1lLnRvVXBwZXJDYXNlKCkgIT0gJ0RJQUxPRycpIHsgcmV0dXJuOyB9XG5cbiAgICB2YXIgZGlhbG9nID0gLyoqIEB0eXBlIHtIVE1MRGlhbG9nRWxlbWVudH0gKi8gKGV2ZW50LnRhcmdldCk7XG4gICAgaWYgKCFkaWFsb2cub3BlbikgeyByZXR1cm47IH1cblxuICAgIC8vIEZpbmQgYSBkaWFsb2dQb2x5ZmlsbEluZm8gd2hpY2ggbWF0Y2hlcyB0aGUgcmVtb3ZlZCA8ZGlhbG9nPi5cbiAgICB0aGlzLnBlbmRpbmdEaWFsb2dTdGFjay5zb21lKGZ1bmN0aW9uKGRwaSkge1xuICAgICAgaWYgKGRwaS5kaWFsb2cgPT0gZGlhbG9nKSB7XG4gICAgICAgIC8vIFRoaXMgY2FsbCB3aWxsIGNsZWFyIHRoZSBkaWFsb2dQb2x5ZmlsbEluZm8gb24gdGhpcyBEaWFsb2dNYW5hZ2VyXG4gICAgICAgIC8vIGFzIGEgc2lkZSBlZmZlY3QuXG4gICAgICAgIGRwaS5tYXliZUhpZGVNb2RhbCgpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcblxuICAvKipcbiAgICogQHBhcmFtIHshZGlhbG9nUG9seWZpbGxJbmZvfSBkcGlcbiAgICogQHJldHVybiB7Ym9vbGVhbn0gd2hldGhlciB0aGUgZGlhbG9nIHdhcyBhbGxvd2VkXG4gICAqL1xuICBkaWFsb2dQb2x5ZmlsbC5EaWFsb2dNYW5hZ2VyLnByb3RvdHlwZS5wdXNoRGlhbG9nID0gZnVuY3Rpb24oZHBpKSB7XG4gICAgdmFyIGFsbG93ZWQgPSAodGhpcy56SW5kZXhIaWdoXyAtIHRoaXMuekluZGV4TG93XykgLyAyIC0gMTtcbiAgICBpZiAodGhpcy5wZW5kaW5nRGlhbG9nU3RhY2subGVuZ3RoID49IGFsbG93ZWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdGhpcy5wZW5kaW5nRGlhbG9nU3RhY2sucHVzaChkcGkpO1xuICAgIGlmICh0aGlzLnBlbmRpbmdEaWFsb2dTdGFjay5sZW5ndGggPT0gMSkge1xuICAgICAgdGhpcy5ibG9ja0RvY3VtZW50KCk7XG4gICAgfVxuICAgIHRoaXMudXBkYXRlU3RhY2tpbmcoKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcblxuICAvKipcbiAgICogQHBhcmFtIHtkaWFsb2dQb2x5ZmlsbEluZm99IGRwaVxuICAgKi9cbiAgZGlhbG9nUG9seWZpbGwuRGlhbG9nTWFuYWdlci5wcm90b3R5cGUucmVtb3ZlRGlhbG9nID0gZnVuY3Rpb24oZHBpKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5wZW5kaW5nRGlhbG9nU3RhY2suaW5kZXhPZihkcGkpO1xuICAgIGlmIChpbmRleCA9PSAtMSkgeyByZXR1cm47IH1cblxuICAgIHRoaXMucGVuZGluZ0RpYWxvZ1N0YWNrLnNwbGljZShpbmRleCwgMSk7XG4gICAgdGhpcy51cGRhdGVTdGFja2luZygpO1xuICAgIGlmICh0aGlzLnBlbmRpbmdEaWFsb2dTdGFjay5sZW5ndGggPT0gMCkge1xuICAgICAgdGhpcy51bmJsb2NrRG9jdW1lbnQoKTtcbiAgICB9XG4gIH07XG5cbiAgZGlhbG9nUG9seWZpbGwuZG0gPSBuZXcgZGlhbG9nUG9seWZpbGwuRGlhbG9nTWFuYWdlcigpO1xuXG4gIC8qKlxuICAgKiBHbG9iYWwgZm9ybSAnZGlhbG9nJyBtZXRob2QgaGFuZGxlci4gQ2xvc2VzIGEgZGlhbG9nIGNvcnJlY3RseSBvbiBzdWJtaXRcbiAgICogYW5kIHBvc3NpYmx5IHNldHMgaXRzIHJldHVybiB2YWx1ZS5cbiAgICovXG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3N1Ym1pdCcsIGZ1bmN0aW9uKGV2KSB7XG4gICAgdmFyIHRhcmdldCA9IGV2LnRhcmdldDtcbiAgICBpZiAoIXRhcmdldCB8fCAhdGFyZ2V0Lmhhc0F0dHJpYnV0ZSgnbWV0aG9kJykpIHsgcmV0dXJuOyB9XG4gICAgaWYgKHRhcmdldC5nZXRBdHRyaWJ1dGUoJ21ldGhvZCcpLnRvTG93ZXJDYXNlKCkgIT0gJ2RpYWxvZycpIHsgcmV0dXJuOyB9XG4gICAgZXYucHJldmVudERlZmF1bHQoKTtcblxuICAgIHZhciBkaWFsb2cgPSBmaW5kTmVhcmVzdERpYWxvZygvKiogQHR5cGUge0VsZW1lbnR9ICovIChldi50YXJnZXQpKTtcbiAgICBpZiAoIWRpYWxvZykgeyByZXR1cm47IH1cblxuICAgIC8vIEZJWE1FOiBUaGUgb3JpZ2luYWwgZXZlbnQgZG9lc24ndCBjb250YWluIHRoZSBlbGVtZW50IHVzZWQgdG8gc3VibWl0IHRoZVxuICAgIC8vIGZvcm0gKGlmIGFueSkuIExvb2sgaW4gc29tZSBwb3NzaWJsZSBwbGFjZXMuXG4gICAgdmFyIHJldHVyblZhbHVlO1xuICAgIHZhciBjYW5kcyA9IFtkb2N1bWVudC5hY3RpdmVFbGVtZW50LCBldi5leHBsaWNpdE9yaWdpbmFsVGFyZ2V0XTtcbiAgICB2YXIgZWxzID0gWydCVVRUT04nLCAnSU5QVVQnXTtcbiAgICBjYW5kcy5zb21lKGZ1bmN0aW9uKGNhbmQpIHtcbiAgICAgIGlmIChjYW5kICYmIGNhbmQuZm9ybSA9PSBldi50YXJnZXQgJiYgZWxzLmluZGV4T2YoY2FuZC5ub2RlTmFtZS50b1VwcGVyQ2FzZSgpKSAhPSAtMSkge1xuICAgICAgICByZXR1cm5WYWx1ZSA9IGNhbmQudmFsdWU7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGRpYWxvZy5jbG9zZShyZXR1cm5WYWx1ZSk7XG4gIH0sIHRydWUpO1xuXG4gIGRpYWxvZ1BvbHlmaWxsWydmb3JjZVJlZ2lzdGVyRGlhbG9nJ10gPSBkaWFsb2dQb2x5ZmlsbC5mb3JjZVJlZ2lzdGVyRGlhbG9nO1xuICBkaWFsb2dQb2x5ZmlsbFsncmVnaXN0ZXJEaWFsb2cnXSA9IGRpYWxvZ1BvbHlmaWxsLnJlZ2lzdGVyRGlhbG9nO1xuXG4gIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlWydleHBvcnRzJ10gPT09ICdvYmplY3QnKSB7XG4gICAgLy8gQ29tbW9uSlMgc3VwcG9ydFxuICAgIG1vZHVsZVsnZXhwb3J0cyddID0gZGlhbG9nUG9seWZpbGw7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiAnYW1kJyBpbiBkZWZpbmUpIHtcbiAgICAvLyBBTUQgc3VwcG9ydFxuICAgIGRlZmluZShmdW5jdGlvbigpIHsgcmV0dXJuIGRpYWxvZ1BvbHlmaWxsOyB9KTtcbiAgfSBlbHNlIHtcbiAgICAvLyBhbGwgb3RoZXJzXG4gICAgd2luZG93WydkaWFsb2dQb2x5ZmlsbCddID0gZGlhbG9nUG9seWZpbGw7XG4gIH1cbn0pKCk7XG4iLCIvLyBUT0RPOiBUaGlzIGlzIG1lc3N5IGNsZWFuIGl0IHVwXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIGNvbnRhaW5lciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5tZGwtbGF5b3V0X19jb250YWluZXInKTtcbiAgdmFyIGRyYXdlciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5tZGwtbGF5b3V0X19kcmF3ZXInKTtcbiAgdmFyIGRyYXdlckJ1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5tZGwtbGF5b3V0X19kcmF3ZXItYnV0dG9uJyk7XG4gIHZhciBvYmZ1c2NhdG9yID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm1kbC1sYXlvdXRfX29iZnVzY2F0b3InKTtcblxuICAvLyBTaW5jZSBNREwgaXNuJ3QgaGFuZGxpbmcgdGhlICdlc2NhcGUnIGtleSBwcm9wZXJseSwgSSBoYWQgdG8gZG8gdGhpc1xuICAvLyBIaWRlcyBkcmF3ZXIgYW5kIG9iZnVzY2F0b3Igb24gZXNjYXBlIGtleWRvd25cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBmdW5jdGlvbihldnQpIHtcbiAgICBpZiAoZXZ0LmtleUNvZGUgPT09IDI3ICYmIGRyYXdlci5jbGFzc0xpc3QuY29udGFpbnMoJ2lzLXZpc2libGUnKSkge1xuICAgICAgY2xvc2VEcmF3ZXIoKTtcbiAgICAgIGhlYWRlckFjY2Vzc2liaWxpdHlUb2dnbGUoKTtcbiAgICB9XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIGNsb3NlRHJhd2VyKCkge1xuICAgIGRyYXdlci5jbGFzc05hbWUgPSAnbWRsLWxheW91dF9fZHJhd2VyJztcbiAgICBvYmZ1c2NhdG9yLmNsYXNzTmFtZSA9ICdtZGwtbGF5b3V0X19vYmZ1c2NhdG9yJztcbiAgfVxuXG4vKioqKioqKioqKioqKioqKioqKi9cbi8qIEV2ZW50IExpc3RlbmVycyAqL1xuLyoqKioqKioqKioqKioqKioqKiovXG4gIGRyYXdlckJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIGhlYWRlckFjY2Vzc2liaWxpdHlUb2dnbGUoKTtcbiAgfSk7XG5cbiAgZHJhd2VyQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBmdW5jdGlvbihldnQpIHtcbiAgICAvLyAyNyBpcyBlc2NhcGUga2V5XG4gICAgLy8gQ2FsbCBhY2Nlc3NpYmlsaXR5IGZ1bmN0aW9uIGlmICdzcGFjZScgb3IgJ2VudGVyJyBpcyBwcmVzc2VkXG4gICAgaWYgKGV2dC5rZXlDb2RlID09PSAzMiB8fCBldnQua2V5Q29kZSA9PT0gMTMpIHtcbiAgICAgIGhlYWRlckFjY2Vzc2liaWxpdHlUb2dnbGUoKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIEFkZCBldmVudCBsaXN0ZW5lciB0byBkcmF3ZXIgZm9yIGVzYyBrZXlcbiAgb2JmdXNjYXRvci5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIGhlYWRlckFjY2Vzc2liaWxpdHlUb2dnbGUoKTtcbiAgfSk7XG5cblxuXG5cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKi9cbi8qIEFjY2Vzc2liaWxpdHkgRnVuY3Rpb24gKi9cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKi9cbiAgLy8gVmFyaWFibGVzIG5lZWRlZCBieSBoZWFkZXJBY2Nlc3NpYmlsaXR5VG9nZ2xlKCkgLSBEZWZpbmVkIGhlcmUgZm9yIGZld2VyIHF1ZXJpZXMgdG8gZG9jdW1lbnRcbiAgdmFyIHRpdGxlUm93ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnNpdGUtaGVhZGVyX190aXRsZS1yb3cnKTtcbiAgdmFyIGxpbmtSb3cgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuc2l0ZS1oZWFkZXJfX2xpbmstcm93Jyk7XG4gIHZhciBwcm9qZWN0TGlua3MgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuc2l0ZS1oZWFkZXJfX2xpbmstcm93IC5uYXZpZ2F0aW9uX19uZXN0ZWQtbGlua3MnKTtcbiAgdmFyIGhlYWRlckxpbmtzID0gbGlua1Jvdy5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdtZGwtbmF2aWdhdGlvbl9fbGluaycpO1xuICB2YXIgZHJhd2VyTGlua3MgPSBkcmF3ZXIuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnbWRsLW5hdmlnYXRpb25fX2xpbmsnKTtcblxuICAvLyBJbml0aWFsaXplIGRyYXdlckxpbmtzICd0YWJpbmRleCcgdG8gLTFcbiAgY2hhbmdlVGFiSW5kZXgoZHJhd2VyTGlua3MsICctMScpO1xuXG4gIC8vIFRoZSBmdW5jdGlvblxuICBmdW5jdGlvbiBoZWFkZXJBY2Nlc3NpYmlsaXR5VG9nZ2xlKCkge1xuICAgIGlmICh0aXRsZVJvdy5nZXRBdHRyaWJ1dGUoJ2FyaWEtaGlkZGVuJykgPT09ICdmYWxzZScpIHtcbiAgICAgIC8vIEhpZGUgaGVhZGVyIGluZm8gZnJvbSBzY3JlZW4tcmVhZGVycyB3aGVuIGRyYXdlciBvcGVuc1xuICAgICAgdGl0bGVSb3cuc2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicsICd0cnVlJyk7XG4gICAgICBsaW5rUm93LnNldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nLCAndHJ1ZScpO1xuXG4gICAgICAvLyBNYWtlIHN1cmUga2V5Ym9hcmQgdXNlcnMgYXJlbid0IHRhYmJpbmcgdGhyb3VnaCBvYmZ1c2NhdGVkIGxpbmtzXG4gICAgICBjaGFuZ2VUYWJJbmRleChoZWFkZXJMaW5rcywgJy0xJyk7XG4gICAgICBjaGFuZ2VUYWJJbmRleChkcmF3ZXJMaW5rcywgJzAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gU2hvdyBoZWFkZXIgaW5mbyB0byBzY3JlZW4tcmVhZGVycyB3aGVuIHRoZSBkcmF3ZXIgY2xvc2VzXG4gICAgICB0aXRsZVJvdy5zZXRBdHRyaWJ1dGUoJ2FyaWEtaGlkZGVuJywgJ2ZhbHNlJyk7XG4gICAgICBsaW5rUm93LnNldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nLCAnZmFsc2UnKTtcbiAgICAgIC8vIEhpZGUgbmVzdGVkIG5hdmlnYXRpb24gbGlua3MgaW4gLnNpdGUtaGVhZGVyX19saW5rLXJvdyAoYmVjYXVzZSB0ZW1wbGF0aW5nKVxuICAgICAgcHJvamVjdExpbmtzLnNldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nLCAndHJ1ZScpO1xuXG4gICAgICBjaGFuZ2VUYWJJbmRleChoZWFkZXJMaW5rcywgJzAnKTtcbiAgICAgIGNoYW5nZVRhYkluZGV4KGRyYXdlckxpbmtzLCAnLTEnKTtcbiAgICB9XG4gICAgLy8gYWRkIHRhYmluZGV4IC0xIHRvIGhlYWRlciBlbGVtZW50c1xuICB9XG5cbiAgZnVuY3Rpb24gY2hhbmdlVGFiSW5kZXgoZWxzLCB2YWwpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVscy5sZW5ndGg7IGkrKykge1xuICAgICAgZWxzW2ldLnNldEF0dHJpYnV0ZSgndGFiaW5kZXgnLCB2YWwpO1xuICAgIH1cbiAgfVxuXG4gIC8vIFJlZ2lzdGVyIHRoZSBDb250YWN0IE1vZGFsXG4gIChmdW5jdGlvbiByZWdpc3Rlck1vZGFsKCkge1xuICAgIHZhciBkaWFsb2cgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdkaWFsb2cnKTtcbiAgICB2YXIgc2hvd0RpYWxvZ0J1dHRvbnMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuc2hvdy1kaWFsb2cnKTtcbiAgICB2YXIgZHJhd2VyQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm1kbC1sYXlvdXRfX2RyYXdlci1idXR0b24nKTtcblxuICAgIC8vIENoZWNrIGZvciAnZGlhbG9nJyBlbGVtZW50IHN1cHBvcnQgaW4gYnJvd3NlciAtIFJlZ2lzdGVyIGlmIG5vdFxuICAgIGlmICghZGlhbG9nLnNob3dNb2RhbCkge1xuICAgICAgZGlhbG9nUG9seWZpbGwucmVnaXN0ZXJEaWFsb2coZGlhbG9nKTtcbiAgICB9XG5cbiAgICAvLyBTaG93IHRoZSBtb2RhbCBvbiBjbGljayBvZiBcIkNvbnRhY3RcIiBsaW5rXG4gICAgc2hvd0RpYWxvZ0J1dHRvbnMuZm9yRWFjaChmdW5jdGlvbihlbCwgaWR4KSB7XG4gICAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBJZiB0aGUgZHJhd2VyIGlzIG9wZW4sIGNsb3NlIGl0IGZpcnN0XG4gICAgICAgIGlmIChkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuaXMtdmlzaWJsZScpKSB7XG4gICAgICAgICAgZHJhd2VyQnV0dG9uLmNsaWNrKCk7XG4gICAgICAgICAgZGlhbG9nLnNob3dNb2RhbCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRpYWxvZy5zaG93TW9kYWwoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICAvLyBDbG9zZSB0aGUgbW9kYWxcbiAgICBkaWFsb2cucXVlcnlTZWxlY3RvcignLmNsb3NlJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgIGRpYWxvZy5jbG9zZSgpO1xuICAgIH0pO1xuICB9KSgpO1xufSk7XG5cbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
