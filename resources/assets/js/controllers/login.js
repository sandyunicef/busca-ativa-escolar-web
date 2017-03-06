(function() {

	angular.module('BuscaAtivaEscolar').controller('LoginCtrl', function ($scope, $rootScope, $cookies, $location, Modals, Config, Auth, Identity) {

		console.log("[core] @Login");

		$rootScope.section = '';

		$scope.email = 'manager_sp@lqdi.net';
		$scope.password = 'demo';
		$scope.isLoading = false;

		$scope.endpoints = {
			allowed: Config.ALLOWED_ENDPOINTS,
			list: Config.API_ENDPOINTS
		};

		function onLoggedIn(session) {

			$scope.isLoading = false;

			console.info("[login_ctrl] Logged in!", session);
			console.info("[login_ctrl] Tenant: ", Identity.getCurrentUser().tenant);

			if(!Identity.getCurrentUser().tenant.is_setup) {
				$location.path('/tenant_setup');
				return;
			}

			$location.path('/dashboard');
		}

		function onError(err) {
			console.error('[login_ctrl] Login failed: ', err);
			Modals.show(Modals.Alert('Usuário ou senha incorretos', 'Por favor, verifique os dados informados e tente novamente.'));
			$scope.isLoading = false;
		}

		$scope.setAPIEndpoint = function(endpointID) {
			Config.setEndpoint(endpointID);
			$cookies.put('FDENP_API_ENDPOINT', endpointID);
		};

		$scope.login = function() {
			$scope.isLoading = true;
			Auth.login($scope.email, $scope.password).then(onLoggedIn, onError);
		};

	});

})();