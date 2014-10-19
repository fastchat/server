var fastchat = angular.module('fastchat', ['ngRoute', 'ngSanitize', 'luegg.directives', 'cfp.hotkeys']);

fastchat.filter('reverse', function() {
  return function(items) {
    return items.slice().reverse();
  };
});

///
/// Directive
///
fastchat.directive("fileread", [function () {
    return {
      scope: {
        fileread: "="
      },
      link: function (scope, element, attributes) {
        element.bind("change", function (changeEvent) {
          var reader = new FileReader();
          reader.onload = function (loadEvent) {
            scope.$apply(function () {
              scope.fileread = loadEvent.target.result;
            });
          }
          reader.readAsDataURL(changeEvent.target.files[0]);
        });
      }
    }
  }]);


//
// Routes
//
fastchat.config(function ($routeProvider, $locationProvider) {
  $routeProvider.
    when('/', {
      templateUrl: 'views/index.html',
    }).
    when('/login', {
      templateUrl:'views/login.html'
    }).
    when('/register', {
      templateUrl:'views/register.html'
    }).
    when('/chat/:group', {
      templateUrl:'views/chat.html'
    }).
    when('/chat', {
      redirectTo: '/chat/0'
    }).
    when('/profile', {
      templateUrl:'views/profile.html'
    }).
    when('/privacy', {
      templateUrl:'views/privacy.html'
    }).
    otherwise({
      redirectTo: '/'
    });
});

fastchat.run(['api', 'authService', function(api, authService) {
  console.log('Root Running');
  authService.init(api, ['/chat', '/group']);
}]);
