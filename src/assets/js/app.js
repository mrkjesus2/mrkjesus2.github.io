// TODO: This is messy clean it up
window.addEventListener('load', function() {
  'use strict';

  var container = document.querySelector('.mdl-layout__container');
  var drawer = document.querySelector('.mdl-layout__drawer');
  var drawerButton = document.querySelector('.mdl-layout__drawer-button');
  var obfuscator = document.querySelector('.mdl-layout__obfuscator');

  // Since MDL isn't handling the 'escape' key properly, I had to do this
  // Hides drawer and obfuscator on escape keydown
  window.addEventListener('keydown', function(evt) {
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
  drawerButton.addEventListener('click', function() {
    headerAccessibilityToggle();
  });

  drawerButton.addEventListener('keydown', function(evt) {
    // 27 is escape key
    // Call accessibility function if 'space' or 'enter' is pressed
    if (evt.keyCode === 32 || evt.keyCode === 13) {
      headerAccessibilityToggle();
    }
  });

  // Add event listener to drawer for esc key
  obfuscator.addEventListener('click', function() {
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

