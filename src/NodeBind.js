// Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
// This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
// The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
// The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
// Code distributed by Google as part of the polymer project is also
// subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt

(function(global) {
  'use strict';

  Node.prototype.bind = function(name, observable, oneTime) {
    var self = this;

    if (oneTime) {
      this[name] = observable;
      return;
    }

    observable.open(function(value) {
      self[name] = value;
    });

    return observable;
  };

  function sanitizeValue(value) {
    return value == null ? '' : value;
  }

  function updateText(node, value) {
    node.data = sanitizeValue(value);
  }

  function textBinding(node) {
    return function(value) {
      return updateText(node, value);
    };
  }

  Text.prototype.bind = function(name, value, oneTime) {
    if (name !== 'textContent')
      return Node.prototype.bind.call(this, name, value, oneTime);

    if (oneTime)
      return updateText(this, value);

    var observable = value;
    updateText(this, observable.open(textBinding(this)));
    return observable;
  }

  function updateAttribute(el, name, value) {
    el.setAttribute(name, sanitizeValue(value));
  }

  function attributeBinding(el, name) {
    return function(value) {
      updateAttribute(el, name, value);
    };
  }

  Element.prototype.bind = function(name, value, oneTime) {
    if (name !== 'style' && name !== 'class')
      return Node.prototype.bind.call(this, name, value, oneTime);

    if (oneTime)
      return updateAttribute(this, name, value);

    var observable = value;
    updateAttribute(this, name, observable.open(attributeBinding(this, name)));
    return observable;
  }

})(this);
