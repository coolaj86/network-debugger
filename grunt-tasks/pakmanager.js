(function () {
  "use strict";

  var path = require('path')
    ;

  module.exports = function (grunt) {
    grunt.registerMultiTask('pakmanager', function () {
      var self = this
        ;

      function pakmanage(f, done) {
        var srcDir = f.src
          ;

        function moveFile() {
          var orig = path.join(srcDir, 'pakmanaged.js');

          grunt.log.writeln('Intermediate File ' + orig.cyan + ' created.');
          grunt.file.copy(orig, f.dest);
          grunt.file['delete'](orig);
          grunt.log.writeln('Intermediate File moved to ' + f.dest.cyan);

          done();
        }

        if (Array.isArray(srcDir)) {
          if (srcDir.length > 1) {
            return done(new TypeError('pakmanger can only take one directory as a source'));
          }
          srcDir = srcDir[0];
        }
        if (!grunt.file.isDir(srcDir)) {
          return done(new TypeError('pakmanger can only take one directory as a source'));
        }

        grunt.util.spawn(
          {
              "cmd": "pakmanager"
            , args: [
                  "-e"
                , self.targets
                , "build"
              ]
            , opts: {
                cwd: path.resolve(srcDir)
              }
          }
          , moveFile
        );
      }

      grunt.util.async.forEachSeries(self.files, pakmanage, self.async());
    });
  };

}());
