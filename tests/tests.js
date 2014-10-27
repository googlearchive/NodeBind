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
}

function then(fn) {
  setTimeout(function() {
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
