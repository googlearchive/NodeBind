module.exports = function(karma) {
  karma.set({
    // base path, that will be used to resolve files and exclude
    basePath: '../../',

    // list of files / patterns to load in the browser
    files: [
      'NodeBind/src/NodeBind.js',
      'NodeBind/tests/igor-tests.js',
      'observe-js/src/observe.js' // needed because of Platform.performMicrotaskCheckpoint(); calls
    ],
    browsers: ['Chrome'],
    singleRun: false,
    frameworks: ['jasmine'],
    autoWatch: true
  });
};
