var fastchat = angular.module('fastchat', ['ngRoute', 'luegg.directives', 'cfp.hotkeys']);

fastchat.filter('reverse', function() {
  return function(items) {
    return items.slice().reverse();
  };
});


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
    otherwise({
      redirectTo: '/'
    });
});

fastchat.run(['api', 'authService', function(api, authService) {
  console.log('Root Running');
  authService.init(api, ['/chat', '/group']);
}]);
