(function () {
  "use strict";

  module.exports = function (grunt) {
    // Configuration
    grunt.initConfig({
      'copy': {
        main: {
          files: [
            {dest:'public', cwd: 'browser/static/', src:['**'], expand:true}
          ]
        }
      },
      'less': {
        main: {
          files: {
            'public/style.css': 'browser/style.less'
          }
        }
      },
      'jade': {
        main: {
          files: {
            'public/index.html': 'browser/index.jade'
          }
        }
      },
      'pakmanager': {
        browser: {
          files: {
            'public/pakmanaged.js': 'browser/'
          }
        }
      },

      'uglify': {
        main: {
          files: {
            'public/pakmanaged.js': 'public/pakmanaged.js'
          }
        }
      },
      'cssmin': {
        main: {
          files: {
            'public/style.css': 'public/style.css'
          }
        }
      },

      'watch': {
        'static': {
          files: ['browser/static/**/*'],
          tasks: ['copy']
        },
        styles: {
          files: ['browser/style.less'],
          tasks: ['less']
        },
        html: {
          files: ['browser/index.jade'],
          tasks: ['jade']
        },
        scripts: {
          files: ['browser/**/*.js'],
          tasks: ['pakmanager']
        }
      }
    });

    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-jade');
    grunt.loadTasks('grunt-tasks/');

    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask('basic',    ['copy', 'jade', 'less', 'pakmanager']);
    grunt.registerTask('compress', ['uglify', 'cssmin']);
    grunt.registerTask('build',    ['basic', 'compress']);
    grunt.registerTask('develop',  ['basic', 'watch']);
  };
}());
