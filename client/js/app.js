var fastchat = angular.module('fastchat', ['ngRoute']);


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
    when('/chat', {
      templateUrl:'views/chat.html'
    }).
    otherwise({
      redirectTo: '/index2.html'
    });
});



fastchat.run(['api', 'authService', function(api, authService) {
  console.log('Root Running');
  authService.init(api, ['/chat', '/group']);
}]);
