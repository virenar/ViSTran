app.controller('MainController', ['$scope', '$filter','$http', function($scope, $filter, $http) {
    var geneNames = ["SOX2", "BRAC2", "P53","ENSG00000157764"];
    $scope.geneNames = geneNames;
    
    
    $scope.queryGene = function(search) {
        var result = $filter('filter')(geneNames, search);
        return result
    };
    
    $scope.isSearching = false;
    
    $scope.results = [];
//    $scope.search = function () {
//        console.log($scope.searchText);
//        $scope.isSearching = true;
//        console.log("http://rest.ensembl.org/sequence/id/" + $scope.searchText + "?");
////        $http.get("http://rest.ensembl.org/sequence/id/" + $scope.searchText + "?", headers={"Content-Type": "json"}).success(function (data) {
//////                    $scope.isSearching = false;
//////                    $scope.results = data;
//////                }).error(function (error) {
//////                    console.error(error);   
//////                });
////    };

    $scope.search = function () {
                $scope.isSearching = true;
                $http({
                    method: 'GET',
                    url: 'http://rest.ensembl.org/sequence/id/'+$scope.searchText + '?',
                }).success(function (data) {
                    $scope.isSearching = false;
                    $scope.results = data;
                    console.log(data);
                }).error(function (error) {
                    console.error(error);   
                });
            };


    
    


 
    
}])