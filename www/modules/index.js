/**
 * Created by vl on 31.3.15.
 */
(function(angular) {
    'use strict';

    angular.module('app', ['ionic', 'ngCordova', 'ionic.service.core', 'ionic.service.push', 'ionic.service.analytics', 'app.auth', 'app.main', 'app.api', 'ngDraggable', 'ngImgCrop'])
        .config(appConfig)
        .service('connectionListener', connectionListener)
        .service('RootScopeEventsToAnalytics', RootScopeEventsToAnalytics)
        .service('appStateListener', appStateListener)
        .run(appRun)
        .controller('SplashController', SplashController);

    appConfig.$inject = ['$urlRouterProvider', '$stateProvider', '$ionicAppProvider', 'appConfig'];
    function appConfig($urlRouterProvider, $stateProvider, $ionicAppProvider, appConfig) {
        $urlRouterProvider.otherwise('/splash');

        $stateProvider
            .state('splash', {
                url: '/splash',
                template: '<ion-view hide-nav-bar="true"></ion-view>',
                controller: 'SplashController'
            });

        $ionicAppProvider.identify({
            app_id: appConfig.ionic.appId,
            api_key: appConfig.ionic.apiKey,
            gcm_id: appConfig.ionic.gcmId,
            dev_push: appConfig.ionic.devPush
        });
    }

    appRun.$inject = ['$ionicPlatform', 'connectionListener', 'multiplatformGeolocation', 'PushInitializer', 'IonicUserInitializer', '$ionicAnalytics', 'RootScopeEventsToAnalytics', 'appStateListener', '$ionicConfig', '$rootScope'];
    function appRun($ionicPlatform, connectionListener, multiplatformGeolocation, PushInitializer, IonicUserInitializer, $ionicAnalytics, RootScopeEventsToAnalytics, appStateListener, $ionicConfig, $rootScope) {
        $ionicPlatform.ready(function() {
            // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
            // for form inputs)
            if (window.cordova && window.cordova.plugins.Keyboard) {
                cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
                cordova.plugins.Keyboard.disableScroll(true);
            }
            if (window.StatusBar) {
                // org.apache.cordova.statusbar required
                StatusBar.styleLightContent();
            }

            $rootScope.$on('$stateChangeStart',
              function(event, toState, toParams, fromState, fromParams){
                 if (toState.name == 'login' && fromState.name.indexOf('main') != -1) {
                     event.preventDefault();
                 }
              });

            $ionicConfig.views.swipeBackEnabled(false);

            multiplatformGeolocation.init();
            connectionListener.listenConnection();
            appStateListener.listenState();
            PushInitializer.init();
            IonicUserInitializer.init();
            $ionicAnalytics.register();
            RootScopeEventsToAnalytics.init();
        });
    }

    SplashController.$inject = ['userApi', '$state'];
    function SplashController(userApi, $state) {
        userApi.checkLoggedIn()
            .then(function() {
                $state.go('main.swiper');
            }, function() {
                $state.go('login');
            });
    }

    connectionListener.$inject = ['$rootScope', 'appSocket'];
    function connectionListener($rootScope, appSocket) {
        var self = this;

        self.online = false;
        self.paused = false;
        self.ignoreSocketDisconnect = false;

        function setOffline() {
            if (self.online) {
                self.online = false;
                $rootScope.$broadcast('connection.off');
            }
        }

        function setOnline() {
            if (!self.online) {
                forceOnline();
            }
        }

        function forceOnline() {
            self.online = true;
            $rootScope.$broadcast('connection.on');
        }

        function paused() {
            self.ignoreSocketDisconnect = true;
        }

        this.listenConnection = function () {
            document.addEventListener("online", setOnline, false);
            document.addEventListener("offline", setOffline, false);
            appSocket.on('connect', setOnline);
            appSocket.on('disconnect', function() {
                if (self.ignoreSocketDisconnect === true) {
                    self.ignoreSocketDisconnect = false;
                } else {
                    setOffline();
                }
            });
            if (ionic.Platform.isIOS()) {
                $rootScope.$on('app.pause', paused);
                $rootScope.$on('app.resume', forceOnline);
            }
        };

        this.getStatus = function () {
            return self.online;
        }
    }
    
    appStateListener.$inject = ['$rootScope'];
    function appStateListener($rootScope) {
        function resume() {
            $rootScope.$broadcast('app.resume');
        }

        function pause() {
            $rootScope.$broadcast('app.pause');
        }

        this.listenState = function () {
            document.addEventListener("resume", resume, false);
            document.addEventListener("pause", pause, false);
        }
    }

    RootScopeEventsToAnalytics.$inject = ['$rootScope', '$ionicAnalytics'];
    function RootScopeEventsToAnalytics($rootScope, $ionicAnalytics) {
        this.init = function() {
            $rootScope.$on('user.login', function() {
                $ionicAnalytics.track('UserLoggedIn');
            });

            $rootScope.$on('connection.off', function() {
                $ionicAnalytics.track('ConnectionStateChange', {
                    isOn: false
                });
            });

            $rootScope.$on('connection.on', function() {
                $ionicAnalytics.track('ConnectionStateChange', {
                    isOn: true
                });
            });

            $rootScope.$on('geolocation.error', function (event, posError) {
                window.cordova && $ionicAnalytics.track('GeolocationError', {
                    timeout: posError.code === PositionError.TIMEOUT,
                    positionUnavailible: posError.code === PositionError.POSITION_UNAVAILABLE,
                    permissionDenied: posError.code === PositionError.PERMISSION_DENIED
                });
            })
        };
    }
})(angular);