'use strict';

describe("Igor's tests", function() {

  describe("text binding", function() {

    function Binding(id) {
      this._id = id;
      this._state = Binding.NEW;
      this._values = [];
    };
    Binding.NEW = 'new';
    Binding.OPEN = 'open';
    Binding.CLOSED = 'closed';

    Binding.prototype = {
      constructor: Binding,

      open: function(domPropertySetter) {
        this._state = Binding.OPEN;
        this._domPropertySetter = domPropertySetter;
      },

      close: function() {
        this._state = Binding.CLOSED;
      },

      setValue: function(newVal) {
        this._values.push(newVal);
      },

      discardChanges: function() {
        //huh?
        //console.log('discarding changes');
      },

      _update: function(newVal) {
        this._domPropertySetter(newVal);
      },
    };

    function dispatchEvent(type, target) {
      var event = document.createEvent('Event');
      event.initEvent(type, true, false);
      target.dispatchEvent(event);
    }


    it("should update a simple binding", function() {
      var text = document.createTextNode('');
      var b1 = new Binding('b1');

      text.bind('textContent', b1);
      expect(text.textContent).toBe('');

      b1._update('hello there');
      expect(text.textContent).toBe('hello there');
    });


    it("should only allow one binding per Node property at a time", function() {
      var text = document.createTextNode('');
      var b1 = new Binding('b1');
      var b2 = new Binding('b2');

      expect(b1._state).toBe(Binding.NEW);
      expect(b2._state).toBe(Binding.NEW);

      text.bind('textContent', b1);
      expect(b1._state).toBe(Binding.OPEN);
      text.bind('textContent', b2);
      expect(b1._state).toBe(Binding.CLOSED);
      expect(b2._state).toBe(Binding.OPEN);

      expect(text.textContent).toBe('');

      b2._update('update from b2');
      expect(text.textContent).toBe('update from b2');

      //BUG in NodeBind: the b1 update callback should have been neutralized
      b1._update('ignore this update');
      expect(text.textContent).toBe('update from b2');
    });


    it("should support simple two way-binding", function() {
      var textInput = document.createElement('input');
      var b1 = new Binding('b1');

      textInput.bind('value', b1);
      b1._update('value1');
      expect(textInput.value).toBe('value1');

      textInput.value = 'value2';
      dispatchEvent('input', textInput);
      expect(textInput.value).toBe('value2');
    });


    it("should not call setValue on closed binding", function() {
      var textInput = document.createElement('input');
      var b1 = new Binding('b1');
      var b2 = new Binding('b2');

      textInput.bind('value', b1);
      textInput.bind('value', b2);

      textInput.value = 'value2';
      dispatchEvent('input', textInput);
      expect(b1._values).toEqual([]);
      expect(b2._values).toEqual(['value2']);
    });
  });
});