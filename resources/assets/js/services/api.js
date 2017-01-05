(function() {
	angular
		.module('BuscaAtivaEscolar')
		.service('API', function API($q, $rootScope, Config) {

			var numPendingRequests = 0;
			var successStatuses = [200, 201, 202, 203];
			var useableErrorStatuses = [400, 401, 403];

			const REQUIRE_AUTH = {'X-Require-Auth': 'auth-required'};

			function isLoading() {
				return (numPendingRequests > 0);
			}

			function getURI(path) {
				return Config.getAPIEndpoint() + path;
			}

			function getTokenURI() {
				return Config.getTokenEndpoint();
			}

			function pushRequest() {
				numPendingRequests++;
			}

			function popRequest() {
				numPendingRequests--;
			}

			function isUseableError(status_code) {
				return useableErrorStatuses.indexOf(parseInt(status_code, 10)) !== -1;
			}

			function isSuccessStatus(status_code) {
				return successStatuses.indexOf(parseInt(status_code, 10)) !== -1;
			}

			$rootScope.isLoading = isLoading;

			this.getURI = getURI;
			this.getTokenURI = getTokenURI;
			this.pushRequest = pushRequest;
			this.popRequest = popRequest;
			this.isUseableError = isUseableError;
			this.isSuccessStatus = isSuccessStatus;
			this.isLoading = isLoading;

			this.REQUIRE_AUTH = REQUIRE_AUTH;

		});
})();