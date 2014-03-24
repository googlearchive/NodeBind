// Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
// This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
// The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
// The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
// Code distributed by Google as part of the polymer project is also
// subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt

// Note: DOMNodeInserted/Removed only fire in webkit if the node is rooted in
// document. This is just an attachment point so that tests will pass in
// webkit.
var testDiv;

var bindings;

function doSetup() {
  testDiv = document.body.appendChild(document.createElement('div'));
  bindings = [];
}

function doTeardown() {
  assert.isFalse(!!Observer._errorThrownDuringCallback);
  document.body.removeChild(testDiv);

  for (var i = 0; i < bindings.length; i++) {
    var binding = bindings[i];
    if (binding)
      binding.close();
  }

  Platform.performMicrotaskCheckpoint();
  assert.strictEqual(0, Observer._allObserversCount);
}

function then(fn) {
  setTimeout(function() {
    Platform.performMicrotaskCheckpoint();
    fn();
  }, 0);

  return {
    then: function(next) {
      return then(next);
    }
  };
}

function dispatchEvent(type, target) {
  var event = document.createEvent('Event');
  event.initEvent(type, true, false);
  target.dispatchEvent(event);
  Platform.performMicrotaskCheckpoint();
}

suite('Text bindings', function() {

  setup(doSetup);
  teardown(doTeardown);

  test('Basic', function(done) {
    var text = document.createTextNode('hi');
    var model = {a: 1};
    bindings.push(text.bind('textContent', new PathObserver(model, 'a')));
    assert.strictEqual('1', text.data);

    model.a = 2;
    then(function() {
      assert.strictEqual('2', text.data);
      done();
    });
  });

  test('oneTime', function() {
    var text = document.createTextNode('hi');
    bindings.push(text.bind('textContent', 1, true));
    assert.strictEqual('1', text.data);
  });

  test('No Path', function() {
    var text = testDiv.appendChild(document.createTextNode('hi'));
    var model = 1;
    bindings.push(text.bind('textContent', new PathObserver(model)));
    assert.strictEqual('1', text.data);
  });

  test('Path unreachable', function() {
    var text = testDiv.appendChild(document.createTextNode('hi'));
    var model = {};
    bindings.push(text.bind('textContent', new PathObserver(model, 'a')))
    assert.strictEqual(text.data, '');
  });

  test('Observer is Model', function(done) {
    var text = document.createTextNode('');
    var model = {a: { b: { c: 1}}};
    var observer = new PathObserver(model, 'a.b.c');
    bindings.push(text.bind('textContent', observer));
    assert.strictEqual(1, Observer._allObserversCount);
    assert.strictEqual('1', text.data);

    model.a.b.c = 2;

    then(function() {
      assert.strictEqual('2', text.data);

      done();
    });
  });
});

suite('Element attribute bindings', function() {

  setup(doSetup);
  teardown(doTeardown);

  test('Basic', function(done) {
    var el = testDiv.appendChild(document.createElement('div'));
    var model = {a: '1'};
    bindings.push(el.bind('foo', new PathObserver(model, 'a')));

    then(function() {
      assert.strictEqual('1', el.getAttribute('foo'));
      model.a = '2';

    }).then(function() {
      assert.strictEqual('2', el.getAttribute('foo'));
      model.a = 232.2;

    }).then(function() {
      assert.strictEqual('232.2', el.getAttribute('foo'));
      model.a = 232;

    }).then(function() {
      assert.strictEqual('232', el.getAttribute('foo'));
      model.a = null;

    }).then(function() {
      assert.strictEqual('', el.getAttribute('foo'));
      model.a = undefined;

    }).then(function() {
      assert.strictEqual('', el.getAttribute('foo'));

      done();
    });
  });

  test('Platform.enableBindingsReflection', function(done) {
    var el = testDiv.appendChild(document.createElement('div'));
    var model = {a: '1'};
    Platform.enableBindingsReflection = true;
    bindings.push(el.bind('foo', new PathObserver(model, 'a')));
    bindings.push(el.bind('bar', new PathObserver(model, 'a')));
    bindings.push(el.bind('baz', new PathObserver(model, 'a')));

    then(function() {
      assert.deepEqual(['bar', 'baz', 'foo'],
          Object.keys(el.bindings_).sort());
      Platform.enableBindingsReflection = false;
      done();
    });
  });

  test('oneTime', function() {
    var el = testDiv.appendChild(document.createElement('div'));
    var model = {a: '1'};
    bindings.push(el.bind('foo', 1, true));
    assert.strictEqual('1', el.getAttribute('foo'));
  });

  test('No path', function(done) {
    var el = testDiv.appendChild(document.createElement('div'));
    var model = 1;
    bindings.push(el.bind('foo', new PathObserver(model)));

    then(function() {
      assert.strictEqual('1', el.getAttribute('foo'));

      done();
    });
  });

  test('Path unreachable', function(done) {
    var el = testDiv.appendChild(document.createElement('div'));
    var model = {};
    bindings.push(el.bind('foo', new PathObserver(model, 'bar')));

    then(function() {
      assert.strictEqual('', el.getAttribute('foo'));

      done();
    });
  });

  test('Dashes', function(done) {
    var el = testDiv.appendChild(document.createElement('div'));
    var model = {a: '1'};
    bindings.push(el.bind('foo-bar', new PathObserver(model, 'a')));

    then(function() {
      assert.strictEqual('1', el.getAttribute('foo-bar'));
      model.a = '2';

    }).then(function() {
      assert.strictEqual('2', el.getAttribute('foo-bar'));

      done();
    });
  });

  test('Element.id, Element.hidden?', function(done) {
    var element = testDiv.appendChild(document.createElement('div'));
    var model = {a: 1, b: 2};
    bindings.push(element.bind('hidden?', new PathObserver(model, 'a')));
    bindings.push(element.bind('id', new PathObserver(model, 'b')));

    assert.isTrue(element.hasAttribute('hidden'));
    assert.strictEqual('', element.getAttribute('hidden'));
    assert.strictEqual('2', element.id);

    model.a = null;

    then(function() {
      assert.isFalse(element.hasAttribute('hidden'));

      model.a = 'foo';
      model.b = 'x';

    }).then(function() {
      assert.isTrue(element.hasAttribute('hidden'));
      assert.strictEqual('', element.getAttribute('hidden'));
      assert.strictEqual('x', element.id);

      done();
    });
  });

  test('Element.id - path unreachable', function() {
    var element = testDiv.appendChild(document.createElement('div'));
    var model = {};
    bindings.push(element.bind('id', new PathObserver(model, 'a')));
    assert.strictEqual(element.id, '');
  });
});

suite('Form Element Bindings', function() {

  setup(doSetup);
  teardown(doTeardown);

  function inputTextAreaValueTest(type, done) {
    var el = testDiv.appendChild(document.createElement(type));
    var model = {x: 42};
    bindings.push(el.bind('value', new PathObserver(model, 'x')));
    assert.strictEqual('42', el.value);

    model.x = 'Hi';
    assert.strictEqual('42', el.value);

    then(function() {
      assert.strictEqual('Hi', el.value);

      el.value = 'changed';
      dispatchEvent('input', el);
      assert.strictEqual('changed', model.x);

      done();
    });
  }

  function inputTextAreaNoPath(type) {
    var el = testDiv.appendChild(document.createElement(type));
    var model = 42;
    bindings.push(el.bind('value', new PathObserver(model)));
    assert.strictEqual('42', el.value);
  }

  function inputTextAreaPathUnreachable(type) {
    var el = testDiv.appendChild(document.createElement(type));
    var model = {};
    bindings.push(el.bind('value', new PathObserver(model, 'a')));
    assert.strictEqual('', el.value);
  }

  test('Input.value', function(done) {
    inputTextAreaValueTest('input', done);
  });

  test('Input.value - oneTime', function() {
    var el = testDiv.appendChild(document.createElement('input'));
    bindings.push(el.bind('value', 42, true));
    assert.strictEqual('42', el.value);
  });

  test('Input.value - no path', function() {
    inputTextAreaNoPath('input');
  });

  test('Input.value - path unreachable', function() {
    inputTextAreaPathUnreachable('input');
  });

  test('TextArea.value', function(done) {
    inputTextAreaValueTest('textarea', done);
  });

  test('TextArea.value - oneTime', function() {
    var el = testDiv.appendChild(document.createElement('textarea'));
    bindings.push(el.bind('value', 42, true));
    assert.strictEqual('42', el.value);
  });

  test('TextArea.value - no path', function() {
    inputTextAreaNoPath('textarea');
  });

  test('TextArea.value - path unreachable', function() {
    inputTextAreaPathUnreachable('textarea');
  });

  test('Input.value - user value rejected', function(done) {
    var model = {val: 'ping'};

    var rejector = new PathObserver(model, 'val');
    rejector.open(function() {
      model.val = 'ping';
    });

    var el = testDiv.appendChild(document.createElement('input'));
    bindings.push(el.bind('value', new PathObserver(model, 'val')));

    then(function() {
      assert.strictEqual('ping', el.value);

      el.value = 'pong';
      dispatchEvent('input', el);

    }).then(function() {
      // rejector will have set the bound value back to 'ping'.
      assert.strictEqual('ping', el.value);

      rejector.close();
      done();
    });
  });

  test('(Checkbox)Input.checked', function(done) {
    var input = testDiv.appendChild(document.createElement('input'));
    testDiv.appendChild(input);
    input.type = 'checkbox';
    var model = {x: true};
    bindings.push(input.bind('checked', new PathObserver(model, 'x')));
    assert.isTrue(input.checked);

    model.x = false;
    assert.isTrue(input.checked);

    then(function() {
      assert.isFalse(input.checked);

      input.click();
      assert.isTrue(model.x);

    }).then(function() {
      input.click();
      assert.isFalse(model.x);

      done();
    });
  });

  test('(Checkbox)Input.checked - oneTime', function() {
    var input = testDiv.appendChild(document.createElement('input'));
    testDiv.appendChild(input);
    input.type = 'checkbox';
    bindings.push(input.bind('checked', true, true));
    assert.isTrue(input.checked);
  });

  test('(Checkbox)Input.checked - path unreachable', function() {
    var input = testDiv.appendChild(document.createElement('input'));
    testDiv.appendChild(input);
    input.type = 'checkbox';
    var model = {};
    bindings.push(input.bind('checked', new PathObserver(model, 'x')));
    assert.isFalse(input.checked);
  });

  test('(Checkbox)Input.checked 2', function(done) {
    var model = {val: true};

    var el = testDiv.appendChild(document.createElement('input'));
    testDiv.appendChild(el);
    el.type = 'checkbox';
    bindings.push(el.bind('checked', new PathObserver(model, 'val')));

    then(function() {
      assert.strictEqual(true, el.checked);

      model.val = false;

    }).then(function() {
      assert.strictEqual(false, el.checked);

      el.click();
      assert.strictEqual(true, model.val);

      el.click();
      assert.strictEqual(false, model.val);

      el.addEventListener('click', function() {
        assert.strictEqual(true, model.val);
      });
      el.addEventListener('change', function() {
        assert.strictEqual(true, model.val);
      });

      var event = document.createEvent('MouseEvent');
      event.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false,
          false, false, false, 0, null);
      el.dispatchEvent(event);

      done();
    })
  });

  test('(Checkbox)Input.checked - binding updated on click', function(done) {
    var model = {val: true};

    var el = testDiv.appendChild(document.createElement('input'));
    testDiv.appendChild(el);
    el.type = 'checkbox';
    bindings.push(el.bind('checked', new PathObserver(model, 'val')));

    then(function() {
      assert.strictEqual(true, el.checked);

      el.addEventListener('click', function() {
        assert.strictEqual(false, model.val);
      });

      var event = document.createEvent('MouseEvent');
      event.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false,
          false, false, false, 0, null);
      el.dispatchEvent(event);

      done();
    })
  });

  test('(Checkbox)Input.checked - binding updated on change', function(done) {
    var model = {val: true};

    var el = testDiv.appendChild(document.createElement('input'));
    testDiv.appendChild(el);
    el.type = 'checkbox';
    bindings.push(el.bind('checked', new PathObserver(model, 'val')));

    then(function() {
      assert.strictEqual(true, el.checked);

      el.addEventListener('change', function() {
        assert.strictEqual(false, model.val);
      });

      var event = document.createEvent('MouseEvent');
      event.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false,
          false, false, false, 0, null);
      el.dispatchEvent(event);

      done();
    });
  });

  test('(Radio)Input.checked', function(done) {
    var input = testDiv.appendChild(document.createElement('input'));
    input.type = 'radio';
    var model = {x: true};
    bindings.push(input.bind('checked', new PathObserver(model, 'x')));
    assert.isTrue(input.checked);

    model.x = false;
    assert.isTrue(input.checked);

    then(function() {
      assert.isFalse(input.checked);

      input.checked = true;
      dispatchEvent('change', input);
      assert.isTrue(model.x);

      done();
    });
  });

  test('(Radio)Input.checked - oneTime', function() {
    var input = testDiv.appendChild(document.createElement('input'));
    input.type = 'radio';
    bindings.push(input.bind('checked', true, true));
    assert.isTrue(input.checked);
  });

  test('(Radio)Input.checked - path unreachable', function() {
    var input = testDiv.appendChild(document.createElement('input'));
    input.type = 'radio';
    var model = {};
    bindings.push(input.bind('checked', new PathObserver(model, 'x')));
    assert.isFalse(input.checked);
  });

  function radioInputChecked2(host, done) {
    var model = {val1: true, val2: false, val3: false, val4: true};
    var RADIO_GROUP_NAME = 'test';

    var container = host.appendChild(document.createElement('div'));

    var el1 = container.appendChild(document.createElement('input'));
    el1.type = 'radio';
    el1.name = RADIO_GROUP_NAME;
    bindings.push(el1.bind('checked', new PathObserver(model, 'val1')));

    var el2 = container.appendChild(document.createElement('input'));
    el2.type = 'radio';
    el2.name = RADIO_GROUP_NAME;
    bindings.push(el2.bind('checked', new PathObserver(model, 'val2')));

    var el3 = container.appendChild(document.createElement('input'));
    el3.type = 'radio';
    el3.name = RADIO_GROUP_NAME;
    bindings.push(el3.bind('checked', new PathObserver(model, 'val3')));

    var el4 = container.appendChild(document.createElement('input'));
    el4.type = 'radio';
    el4.name = 'othergroup';
    bindings.push(el4.bind('checked', new PathObserver(model, 'val4')));

    then(function() {
      assert.strictEqual(true, el1.checked);
      assert.strictEqual(false, el2.checked);
      assert.strictEqual(false, el3.checked);
      assert.strictEqual(true, el4.checked);

      model.val1 = false;
      model.val2 = true;

    }).then(function() {
      assert.strictEqual(false, el1.checked);
      assert.strictEqual(true, el2.checked);
      assert.strictEqual(false, el3.checked);
      assert.strictEqual(true, el4.checked);

      el1.checked = true;
      dispatchEvent('change', el1);
      assert.strictEqual(true, model.val1);
      assert.strictEqual(false, model.val2);
      assert.strictEqual(false, model.val3);
      assert.strictEqual(true, model.val4);

      el3.checked = true;
      dispatchEvent('change', el3);
      assert.strictEqual(false, model.val1);
      assert.strictEqual(false, model.val2);
      assert.strictEqual(true, model.val3);
      assert.strictEqual(true, model.val4);

      done();
    })
  }

  test('(Radio)Input.checked 2', function(done) {
    radioInputChecked2(testDiv, done);
  });

  test('(Radio)Input.checked 2 - ShadowRoot', function(done) {
    if (!HTMLElement.prototype.webkitCreateShadowRoot) {
      done();
      return;
    }

    var div = document.createElement('div');
    var shadowRoot = div.webkitCreateShadowRoot();
    radioInputChecked2(shadowRoot, done);
  });

  function radioInputCheckedMultipleForms(host, done) {
    var model = {val1: true, val2: false, val3: false, val4: true};
    var RADIO_GROUP_NAME = 'test';

    var container = testDiv.appendChild(document.createElement('div'));
    var form1 = container.appendChild(document.createElement('form'));
    var form2 = container.appendChild(document.createElement('form'));

    var el1 = form1.appendChild(document.createElement('input'));
    el1.type = 'radio';
    el1.name = RADIO_GROUP_NAME;
    bindings.push(el1.bind('checked', new PathObserver(model, 'val1')));

    var el2 = form1.appendChild(document.createElement('input'));
    el2.type = 'radio';
    el2.name = RADIO_GROUP_NAME;
    bindings.push(el2.bind('checked', new PathObserver(model, 'val2')));

    var el3 = form2.appendChild(document.createElement('input'));
    el3.type = 'radio';
    el3.name = RADIO_GROUP_NAME;
    bindings.push(el3.bind('checked', new PathObserver(model, 'val3')));

    var el4 = form2.appendChild(document.createElement('input'));
    el4.type = 'radio';
    el4.name = RADIO_GROUP_NAME;
    bindings.push(el4.bind('checked', new PathObserver(model, 'val4')));

    then(function() {
      assert.strictEqual(true, el1.checked);
      assert.strictEqual(false, el2.checked);
      assert.strictEqual(false, el3.checked);
      assert.strictEqual(true, el4.checked);

      el2.checked = true;
      dispatchEvent('change', el2);
      assert.strictEqual(false, model.val1);
      assert.strictEqual(true, model.val2);

      // Radio buttons in form2 should be unaffected
      assert.strictEqual(false, model.val3);
      assert.strictEqual(true, model.val4);

      el3.checked = true;
      dispatchEvent('change', el3);
      assert.strictEqual(true, model.val3);
      assert.strictEqual(false, model.val4);

      // Radio buttons in form1 should be unaffected
      assert.strictEqual(false, model.val1);
      assert.strictEqual(true, model.val2);

      done();
    })
  }

  test('(Radio)Input.checked - multiple forms', function(done) {
    radioInputCheckedMultipleForms(testDiv, done);
  });

  test('(Radio)Input.checked - multiple forms - ShadowRoot', function(done) {
    if (!HTMLElement.prototype.webkitCreateShadowRoot) {
      done();
      return;
    }

    var div = document.createElement('div');
    var shadowRoot = div.webkitCreateShadowRoot();
    radioInputCheckedMultipleForms(shadowRoot, done);
  });

  test('Select.selectedIndex', function(done) {
    var select = testDiv.appendChild(document.createElement('select'));
    testDiv.appendChild(select);
    var option0 = select.appendChild(document.createElement('option'));
    var option1 = select.appendChild(document.createElement('option'));
    var option2 = select.appendChild(document.createElement('option'));

    var model = {
      val: 2
    };

    bindings.push(select.bind('selectedIndex', new PathObserver(model, 'val')));
    then(function() {
      assert.strictEqual(2, select.selectedIndex);

      select.selectedIndex = 1;
      dispatchEvent('change', select);
      assert.strictEqual(1, model.val);

      done();
    });
  });

  test('Select.selectedIndex - oneTime', function(done) {
    var select = testDiv.appendChild(document.createElement('select'));
    testDiv.appendChild(select);
    var option0 = select.appendChild(document.createElement('option'));
    var option1 = select.appendChild(document.createElement('option'));
    var option2 = select.appendChild(document.createElement('option'));

    bindings.push(select.bind('selectedIndex', 2, true));

    then(function() {
      assert.strictEqual(2, select.selectedIndex);

      done();
    });
  });

  test('Select.selectedIndex - path NaN', function(done) {
    var select = testDiv.appendChild(document.createElement('select'));
    testDiv.appendChild(select);
    var option0 = select.appendChild(document.createElement('option'));
    var option1 = select.appendChild(document.createElement('option'));
    option1.selected = true;
    var option2 = select.appendChild(document.createElement('option'));

    var model = {
      val: 'foo'
    };

    bindings.push(select.bind('selectedIndex', new PathObserver(model, 'val')));
    then(function() {
      assert.strictEqual(0, select.selectedIndex);

      done();
    });
  });

  test('Option.value', function(done) {
    var option = testDiv.appendChild(document.createElement('option'));
    var model = {x: 42};
    bindings.push(option.bind('value', new PathObserver(model, 'x')));
    assert.strictEqual('42', option.value);

    model.x = 'Hi';
    assert.strictEqual('42', option.value);

    then(function() {
      assert.strictEqual('Hi', option.value);

      done();
    });
  });

  test('Option.value - oneTime', function() {
    var option = testDiv.appendChild(document.createElement('option'));
    bindings.push(option.bind('value', 42, true));
    assert.strictEqual('42', option.value);
  });

  test('Select.selectedIndex - path unreachable', function(done) {
    var select = testDiv.appendChild(document.createElement('select'));
    testDiv.appendChild(select);
    var option0 = select.appendChild(document.createElement('option'));
    var option1 = select.appendChild(document.createElement('option'));
    option1.selected = true;
    var option2 = select.appendChild(document.createElement('option'));

    var model = {};

    bindings.push(select.bind('selectedIndex', new PathObserver(model, 'val')));

    then(function() {
      assert.strictEqual(0, select.selectedIndex);

      done();
    });
  });

  test('Select.value', function(done) {
    var select = testDiv.appendChild(document.createElement('select'));
    testDiv.appendChild(select);
    var option0 = select.appendChild(document.createElement('option'));
    var option1 = select.appendChild(document.createElement('option'));
    var option2 = select.appendChild(document.createElement('option'));

    var model = {
      opt0: 'a',
      opt1: 'b',
      opt2: 'c',
      selected: 'b'
    };

    bindings.push(option0.bind('value', new PathObserver(model, 'opt0')));
    bindings.push(option1.bind('value', new PathObserver(model, 'opt1')));
    bindings.push(option2.bind('value', new PathObserver(model, 'opt2')));

    bindings.push(select.bind('value', new PathObserver(model, 'selected')));

    then(function() {
      assert.strictEqual('b', select.value);

      select.value = 'c';
      dispatchEvent('change', select);
      assert.strictEqual('c', model.selected);

      model.opt2 = 'X';

    }).then(function() {
      assert.strictEqual('X', select.value);
      assert.strictEqual('X', model.selected);

      model.selected = 'a';

    }).then(function() {
      assert.strictEqual('a', select.value);

      done();
    });
  });
});
