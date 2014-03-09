// Copyright 2013 Google Inc.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Note: DOMNodeInserted/Removed only fire in webkit if the node is rooted in
// document. This is just an attachment point so that tests will pass in
// webkit.
var testDiv;

function unbindAll(node) {
  node.unbindAll();
  for (var child = node.firstChild; child; child = child.nextSibling)
    unbindAll(child);
}

function doSetup() {
  testDiv = document.body.appendChild(document.createElement('div'));
}

function doTeardown() {
  assert.isFalse(!!Observer._errorThrownDuringCallback);
  document.body.removeChild(testDiv);
  unbindAll(testDiv);
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
    text.bind('textContent', new PathObserver(model, 'a'));
    assert.strictEqual('1', text.data);

    model.a = 2;
    then(function() {
      assert.strictEqual('2', text.data);
      text.unbind('textContent');
      model.a = 3;
    }).then(function() {
      // TODO(rafaelw): Throw on binding to unavailable property?
      assert.strictEqual('2', text.data);

      done();
    });
  });

  test('oneTime', function() {
    var text = document.createTextNode('hi');
    text.bind('textContent', 1, true);
    assert.strictEqual('1', text.data);
  });

  test('No Path', function() {
    var text = testDiv.appendChild(document.createTextNode('hi'));
    var model = 1;
    text.bind('textContent', new PathObserver(model));
    assert.strictEqual('1', text.data);
  });

  test('Path unreachable', function() {
    var text = testDiv.appendChild(document.createTextNode('hi'));
    var model = {};
    text.bind('textContent', new PathObserver(model, 'a'));
    assert.strictEqual(text.data, '');
  });

  test('Observer is Model', function(done) {
    var text = document.createTextNode('');
    var model = {a: { b: { c: 1}}};
    var observer = new PathObserver(model, 'a.b.c');
    text.bind('textContent', observer);
    assert.strictEqual(1, Observer._allObserversCount);
    assert.strictEqual('1', text.data);

    model.a.b.c = 2;

    then(function() {
      assert.strictEqual('2', text.data);
      text.unbind('textContent');

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
    el.bind('foo', new PathObserver(model, 'a'));

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

  test('oneTime', function() {
    var el = testDiv.appendChild(document.createElement('div'));
    var model = {a: '1'};
    el.bind('foo', 1, true);
    assert.strictEqual('1', el.getAttribute('foo'));
  });

  test('No path', function(done) {
    var el = testDiv.appendChild(document.createElement('div'));
    var model = 1;
    el.bind('foo', new PathObserver(model));

    then(function() {
      assert.strictEqual('1', el.getAttribute('foo'));

      done();
    });
  });

  test('Path unreachable', function(done) {
    var el = testDiv.appendChild(document.createElement('div'));
    var model = {};
    el.bind('foo', new PathObserver(model, 'bar'));

    then(function() {
      assert.strictEqual('', el.getAttribute('foo'));

      done();
    });
  });

  test('Dashes', function(done) {
    var el = testDiv.appendChild(document.createElement('div'));
    var model = {a: '1'};
    el.bind('foo-bar', new PathObserver(model, 'a'));

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
    element.bind('hidden?', new PathObserver(model, 'a'));
    element.bind('id', new PathObserver(model, 'b'));

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
    element.bind('id', new PathObserver(model, 'a'));
    assert.strictEqual(element.id, '');
  });
});

suite('Form Element Bindings', function() {

  setup(doSetup);
  teardown(doTeardown);

  function inputTextAreaValueTest(type, done) {
    var el = testDiv.appendChild(document.createElement(type));
    var model = {x: 42};
    el.bind('value', new PathObserver(model, 'x'));
    assert.strictEqual('42', el.value);

    model.x = 'Hi';
    assert.strictEqual('42', el.value);

    then(function() {
      assert.strictEqual('Hi', el.value);

      el.value = 'changed';
      dispatchEvent('input', el);
      assert.strictEqual('changed', model.x);

      el.unbind('value');

      el.value = 'changed again';
      dispatchEvent('input', el);
      assert.strictEqual('changed', model.x);

      el.bind('value', new PathObserver(model, 'x'));
      model.x = null;
    }).then(function() {
      assert.strictEqual('', el.value);

      done();
    });
  }

  function inputTextAreaNoPath(type) {
    var el = testDiv.appendChild(document.createElement(type));
    var model = 42;
    el.bind('value', new PathObserver(model));
    assert.strictEqual('42', el.value);
  }

  function inputTextAreaPathUnreachable(type) {
    var el = testDiv.appendChild(document.createElement(type));
    var model = {};
    el.bind('value', new PathObserver(model, 'a'));
    assert.strictEqual('', el.value);
  }

  test('Input.value', function(done) {
    inputTextAreaValueTest('input', done);
  });

  test('Input.value - oneTime', function() {
    var el = testDiv.appendChild(document.createElement('input'));
    el.bind('value', 42, true);
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
    el.bind('value', 42, true);
    assert.strictEqual('42', el.value);
  });

  test('TextArea.value - no path', function() {
    inputTextAreaNoPath('textarea');
  });

  test('TextArea.value - path unreachable', function() {
    inputTextAreaPathUnreachable('textarea');
  });

  test('Input.value - detailed', function(done) {
    var model = {val: 'ping'};

    var el = testDiv.appendChild(document.createElement('input'));
    el.bind('value', new PathObserver(model, 'val'));

    then(function() {
      assert.strictEqual('ping', el.value);

      el.value = 'pong';
      dispatchEvent('input', el);
      assert.strictEqual('pong', model.val);

      // Try a deep path.
      model = {
        a: {
          b: {
            c: 'ping'
          }
        }
      };

      el.bind('value', new PathObserver(model, 'a.b.c'));

    }).then(function() {
      assert.strictEqual('ping', el.value);

      el.value = 'pong';
      dispatchEvent('input', el);
      assert.strictEqual('pong', Path.get('a.b.c').getValueFrom(model));

      // Start with the model property being absent.
      delete model.a.b.c;

    }).then(function() {
      assert.strictEqual('', el.value);

      el.value = 'pong';
      dispatchEvent('input', el);
      assert.strictEqual('pong', Path.get('a.b.c').getValueFrom(model));

    }).then(function() {
      // Model property unreachable (and unsettable).
      delete model.a.b;

    }).then(function() {
      assert.strictEqual('', el.value);

      el.value = 'pong';
      dispatchEvent('input', el);
      assert.strictEqual(undefined, Path.get('a.b.c').getValueFrom(model));

      done();
    });
  });

  test('Input.value - user value rejected', function(done) {
    var model = {val: 'ping'};

    var rejector = new PathObserver(model, 'val');
    rejector.open(function() {
      model.val = 'ping';
    });

    var el = testDiv.appendChild(document.createElement('input'));
    el.bind('value', new PathObserver(model, 'val'));

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
    input.bind('checked', new PathObserver(model, 'x'));
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
    input.bind('checked', true, true);
    assert.isTrue(input.checked);
  });

  test('(Checkbox)Input.checked - path unreachable', function() {
    var input = testDiv.appendChild(document.createElement('input'));
    testDiv.appendChild(input);
    input.type = 'checkbox';
    var model = {};
    input.bind('checked', new PathObserver(model, 'x'));
    assert.isFalse(input.checked);
  });

  test('(Checkbox)Input.checked 2', function(done) {
    var model = {val: true};

    var el = testDiv.appendChild(document.createElement('input'));
    testDiv.appendChild(el);
    el.type = 'checkbox';
    el.bind('checked', new PathObserver(model, 'val'));

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
    el.bind('checked', new PathObserver(model, 'val'));

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
    el.bind('checked', new PathObserver(model, 'val'));

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
    input.bind('checked', new PathObserver(model, 'x'));
    assert.isTrue(input.checked);

    model.x = false;
    assert.isTrue(input.checked);

    then(function() {
      assert.isFalse(input.checked);

      input.checked = true;
      dispatchEvent('change', input);
      assert.isTrue(model.x);

      input.unbind('checked');

      input.checked = false;
      dispatchEvent('change', input);
      assert.isTrue(model.x);

      done();
    });
  });

  test('(Radio)Input.checked - oneTime', function() {
    var input = testDiv.appendChild(document.createElement('input'));
    input.type = 'radio';
    input.bind('checked', true, true);
    assert.isTrue(input.checked);
  });

  test('(Radio)Input.checked - path unreachable', function() {
    var input = testDiv.appendChild(document.createElement('input'));
    input.type = 'radio';
    var model = {};
    input.bind('checked', new PathObserver(model, 'x'));
    assert.isFalse(input.checked);
  });

  function radioInputChecked2(host, done) {
    var model = {val1: true, val2: false, val3: false, val4: true};
    var RADIO_GROUP_NAME = 'test';

    var container = host.appendChild(document.createElement('div'));

    var el1 = container.appendChild(document.createElement('input'));
    el1.type = 'radio';
    el1.name = RADIO_GROUP_NAME;
    el1.bind('checked', new PathObserver(model, 'val1'));

    var el2 = container.appendChild(document.createElement('input'));
    el2.type = 'radio';
    el2.name = RADIO_GROUP_NAME;
    el2.bind('checked', new PathObserver(model, 'val2'));

    var el3 = container.appendChild(document.createElement('input'));
    el3.type = 'radio';
    el3.name = RADIO_GROUP_NAME;
    el3.bind('checked', new PathObserver(model, 'val3'));

    var el4 = container.appendChild(document.createElement('input'));
    el4.type = 'radio';
    el4.name = 'othergroup';
    el4.bind('checked', new PathObserver(model, 'val4'));

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

      unbindAll(host);
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
    el1.bind('checked', new PathObserver(model, 'val1'));

    var el2 = form1.appendChild(document.createElement('input'));
    el2.type = 'radio';
    el2.name = RADIO_GROUP_NAME;
    el2.bind('checked', new PathObserver(model, 'val2'));

    var el3 = form2.appendChild(document.createElement('input'));
    el3.type = 'radio';
    el3.name = RADIO_GROUP_NAME;
    el3.bind('checked', new PathObserver(model, 'val3'));

    var el4 = form2.appendChild(document.createElement('input'));
    el4.type = 'radio';
    el4.name = RADIO_GROUP_NAME;
    el4.bind('checked', new PathObserver(model, 'val4'));

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

      unbindAll(host);
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

    select.bind('selectedIndex', new PathObserver(model, 'val'));
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

    select.bind('selectedIndex', 2, true);

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

    select.bind('selectedIndex', new PathObserver(model, 'val'));
    then(function() {
      assert.strictEqual(0, select.selectedIndex);

      done();
    });
  });

  test('Option.value', function(done) {
    var option = testDiv.appendChild(document.createElement('option'));
    var model = {x: 42};
    option.bind('value', new PathObserver(model, 'x'));
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
    option.bind('value', 42, true);
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

    select.bind('selectedIndex', new PathObserver(model, 'val'));

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

    option0.bind('value', new PathObserver(model, 'opt0'));
    option1.bind('value', new PathObserver(model, 'opt1'));
    option2.bind('value', new PathObserver(model, 'opt2'));

    select.bind('value', new PathObserver(model, 'selected'));

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
