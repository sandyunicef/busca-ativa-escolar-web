(function() {
	angular.module("BuscaAtivaEscolar")
		.controller('ChildCasesCtrl', ChildCasesCtrl)
		.controller('ChildCaseStepCtrl', ChildCaseStepCtrl)
		.config(function ($stateProvider) {
			$stateProvider
				.state('child_viewer.cases', {
					url: '/children/{child_id}',
					templateUrl: '/views/children/view/steps.html',
					controller: 'ChildCasesCtrl'
				})
				.state('child_viewer.cases.view_step', {
					url: '/{step_type}/{step_id}',
					templateUrl: '/views/children/view/case_info.html',
					controller: 'ChildCaseStepCtrl'
				})
		});

	function ChildCasesCtrl($scope, $state, $stateParams, ngToast, Utils, Modals, Children, CaseSteps, Decorators) {

		$scope.Decorators = Decorators;
		$scope.Children = Children;
		$scope.CaseSteps = CaseSteps;

		$scope.child_id = $scope.$parent.child_id;
		$scope.child = $scope.$parent.child;

		$scope.openedCase = {};

		$scope.child.$promise.then(openCurrentCase);

		function openCurrentCase(child) {
			$scope.openedCase = child.cases.find(function(item) {
				if($stateParams.case_id) return item.id === $stateParams.case_id;
				return item.case_status === 'in_progress';
			});
		}

		console.log("[core] @ChildCasesCtrl", $scope.child, $scope.openedCase);

		$scope.collapseCase = function (childCase) {
			$scope.openedCase = childCase;
		};

		$scope.isCaseCollapsed = function(childCase) {
			if(!$scope.openedCase) return true;
			return $scope.openedCase.id !== childCase.id;
		};

		$scope.renderStepStatusClass = function(childCase, step) {
			if(step.is_completed) return 'step-completed';
			if(childCase.current_step_id === step.id) return 'step-current';
			return 'step-pending';
		};

		$scope.canOpenStep = function(step) {
			if(step.is_completed) return true;
			if(step.id === $scope.openedCase.current_step_id) return true;
			return false;
		};

		$scope.openStep = function(selectedStep) {
			if(!$scope.canOpenStep(selectedStep)) return false;

			$state.go('child_viewer.cases.view_step', {step_type: selectedStep.step_type, step_id: selectedStep.id});
		};

		$scope.canCompleteStep = function(childCase, step) {
			return (step.id === childCase.current_step_id && !step.is_completed && !step.is_pending_assignment);
		};

		$scope.isPendingAssignment = function (step) {
			return !step.is_completed && step.is_pending_assignment;
		};

		$scope.hasNextStep = function(step) {
			if(!step) return false;
			if(step.step_type === 'BuscaAtivaEscolar\\CaseSteps\\Observacao' && step.report_index === 4) return false;
			return true;
		};

		$scope.completeStep = function(step) {

			var question = 'Tem certeza que deseja prosseguir para a próxima etapa?';
			var explanation = 'Ao progredir de etapa, a etapa atual será marcada como concluída. Os dados preenchidos serão salvos.';

			if(step.step_type === "BuscaAtivaEscolar\\CaseSteps\\AnaliseTecnica") {
				question = 'Tem certeza que deseja concluir a Análise Técnica?';
				explanation = 'Ao dizer SIM, a Análise Técnica será marcada como concluída e nenhuma informação poderá ser editada. Os dados preenchidos serão salvos.';
			}

			Modals.show(Modals.Confirm(question, explanation)).then(function () {
				return CaseSteps.complete({type: step.step_type, id: step.id}).$promise;
			}).then(function (response) {

				if(response.fields) {
					ngToast.danger("É necessário preencher todos os campos obrigatórios para concluir essa etapa. Campos incorretos: " + Object.keys(response.fields).join(", "));
					$state.go('child_viewer.cases.view_step', {step_type: step.step_type, step_id: step.id});
					return;
				}

				if(response.status !== "ok") {
					ngToast.danger("Ocorreu um erro ao concluir a etapa! (reason=" + response.reason + ")")
					return;
				}

				if(!response.hasNext) {
					ngToast.success("A última etapa de observação foi concluída, e o caso foi encerrado!");
					$state.go('child_viewer.cases', {child_id: $scope.child.id}, {reload: true});
					return;
				}

				ngToast.success("Etapa concluída! A próxima etapa já está disponível para início");
				$state.go('child_viewer.cases.view_step', {step_type: response.nextStep.step_type, step_id: response.nextStep.id}, {reload: true});

			})
		};

		// TODO: handle case cancelling
	}

	function ChildCaseStepCtrl($scope, $state, $stateParams, ngToast, Utils, Modals, Children, Decorators, CaseSteps, StaticData) {
		$scope.Decorators = Decorators;
		$scope.Children = Children;
		$scope.CaseSteps = CaseSteps;
		$scope.static = StaticData;

		$scope.editable = true;
		$scope.showAll = false;
		$scope.showTitle = true;

		$scope.child_id = $scope.$parent.child_id;
		$scope.child = $scope.$parent.child;
		$scope.checkboxes = {};

		$scope.step = CaseSteps.find({type: $stateParams.step_type, id: $stateParams.step_id, with: 'fields'});
		$scope.step.$promise.then(function (step) {
			$scope.fields = step.fields;
		});

		console.log("[core] @ChildCaseStepCtrl", $scope.step);

		$scope.saveAndProceed = function() {
			$scope.save().then(function() {
				$scope.$parent.completeStep($scope.step);
			});
		};

		$scope.isStepOpen = function (stepClassName) {
			if(!$scope.step) return false;
			return $scope.step.step_type === "BuscaAtivaEscolar\\CaseSteps\\" + stepClassName;
		};

		$scope.hasNextStep = function() {
			if(!$scope.step) return false;
			if($scope.step.step_type === 'BuscaAtivaEscolar\\CaseSteps\\Observacao' && $scope.step.report_index === 4) return false;
			return true;
		};

		$scope.canEditStep = function() {
			if(!$scope.step) return false;
			if(!$scope.$parent.openedCase) return false;
			return (!$scope.step.is_completed);
		};

		$scope.canCompleteStep = function() {
			if(!$scope.step) return false;
			if(!$scope.$parent.openedCase) return false;
			return ($scope.step.id === $scope.$parent.openedCase.current_step_id && !$scope.step.is_completed && !$scope.step.is_pending_assignment);
		};

		$scope.isPendingAssignment = function () {
			if(!$scope.step) return false;
			return !$scope.step.is_completed && !!$scope.step.is_pending_assignment;
		};

		$scope.fillWithCurrentDate = function (field) {
			$scope.fields[field] = (new Date()).toISOString().substring(0, 10);
		};

		function filterOutEmptyFields(data) {
			var filtered = {};

			for(var i in data) {
				if(!data.hasOwnProperty(i)) continue;
				if(data[i] === null) continue;
				if(data[i] === undefined) continue;
				if(("" + data[i]).trim().length <= 0) continue;
				filtered[i] = data[i];
			}

			return filtered;
		}

		function prepareDateFields(data) {
			var dateOnlyFields = ['enrolled_at', 'report_date', 'dob', 'guardian_dob', 'reinsertion_date'];

			for(var i in data) {
				if(!data.hasOwnProperty(i)) continue;
				if(dateOnlyFields.indexOf(i) === -1) continue;

				data[i] = Utils.stripTimeFromTimestamp(data[i]);
			}

			return data;
		}

		$scope.assignUser = function() {

			CaseSteps.assignableUsers({type: $scope.step.step_type, id: $scope.step.id}).$promise
				.then(function (res) {
					if(!res.users) return ngToast.danger("Nenhum usuário pode ser atribuído para essa etapa!");
					return Modals.show(Modals.UserPicker('Atribuindo responsabilidade', 'Indique qual usuário deve ficar responsável por essa etapa:', res.users, false))
				})
				.then(function (user) {
					return CaseSteps.assignUser({type: $scope.step.step_type, id: $scope.step.id, user_id: user.id}).$promise;
				}).
				then(function (res) {
					ngToast.success("Usuário atribuído!");
					$state.go('child_viewer.cases.view_step', {step_type: $scope.step.step_type, step_id: $scope.step.id}, {reload: true});
				});

		};

		$scope.isCheckboxChecked = function(field, value) {
			if(!$scope.fields[field]) $scope.fields[field] = [];
			return $scope.fields[field].indexOf(value) !== -1;
		};

		$scope.toggleCheckbox = function (field, value) {
			if(!$scope.fields[field]) $scope.fields[field] = []; // Ensures list exists
			var index = $scope.fields[field].indexOf(value); // Check if in list
			if(index === -1) return $scope.fields[field].push(value); // Add to list
			return $scope.fields[field].splice(index, 1); // Remove from list
		};

		$scope.save = function() {
			var data = $scope.step.fields;
			data = filterOutEmptyFields($scope.step.fields);
			data = prepareDateFields(data);

			data.type = $scope.step.step_type;
			data.id = $scope.step.id;

			console.info("[child_viewer.step_editor] Saving step data: ", data);

			return CaseSteps.save(data).$promise.then(function (response) {
				if(response.fields) {
					ngToast.danger("Por favor, preencha os campos corretamente! Campos incorretos: " + Object.keys(response.fields));
					return;
				}

				// TODO: highlight field on error

				if(response.status !== "ok") {
					ngToast.danger("Ocorreu um erro ao salvar os dados da etapa! (status=" + response.status + ", reason=" + response.reason + ")");
					return;
				}

				ngToast.success("Os campos da etapa foram salvos com sucesso!");
			})
		}
	}
})();