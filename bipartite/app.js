(function () {
var myApp = angular.module('angularMaterial',['ngMaterial']);

myApp.directive('bipartiteChart', function() {
        function link(scope, attr){
            
            var bP={};
           

            //-------Color of the subbars-----------------------------------
            function pastelColors(){
                var seed = 1
                var r = (Math.round(Math.random()* 127) + 127).toString(16);
                var g = (Math.round(Math.random()* 127) + 127).toString(16);
                var b = (Math.round(Math.random()* 127) + 127).toString(16);
                return '#' + r + g + b;
            }

            var colors = [];
            for(var i = 1; i <= 15; i++){
                var col = pastelColors(i);
                if (colors.indexOf(col) != -1){
                    i -= 1;
                    continue;
                }
                colors.push(col);
            }



            //---FUNCTIONS - Generate data objects containing the keys and data
            bP.partData = function(data,p){
                // create json data file with keys and data index
                var sData={};

                sData.keys=[
                    d3.set(data.map(function(d){ return d[0];})).values().sort(function(a,b){ return (parseInt(a)<parseInt(b))? -1 : (parseInt(a)>parseInt(b))? 1: 0;}),
                    d3.set(data.map(function(d){ return d[1];})).values().sort(function(a,b){ return (parseInt(a)<parseInt(b))? -1 : (parseInt(a)>parseInt(b))? 1: 0;})		
                ];

                sData.data = [	sData.keys[0].map( function(d){ return sData.keys[1].map( function(v){ return 0; }); }),
                    sData.keys[1].map( function(d){ return sData.keys[0].map( function(v){ return 0; }); }) 
                ];

                // for each user defined data, add appropriate values to the json data file
                data.forEach(function(d){ 
                    sData.data[0][sData.keys[0].indexOf(d[0].toString())][sData.keys[1].indexOf(d[1].toString())]=parseFloat(d[p]).toFixed(3);
                    sData.data[1][sData.keys[1].indexOf(d[1].toString())][sData.keys[0].indexOf(d[0].toString())]=parseFloat(d[p]).toFixed(3); 
                });

                return sData;
            }

            
        
                        
             
            
         

            //----FUNCTIONS - Use data object to make another object containing the svg positions----------------------------
            function visualize(data){

                var vis ={};
                function calculatePosition(stateCounts, startHeight, totalHeight, buffMargin, minHeight,heatmapdata){
                    var total=d3.sum(stateCounts);
                    var sum=0, neededHeight=0, leftoverHeight= totalHeight-startHeight-2*buffMargin*stateCounts.length;
                    var ret =[];
                    if (typeof heatmapdata === "undefined"){
                        console.log('the property is not available inside...'); // print into console
                    }

                    //Determine the percent of each state, its value, and its height proportional to total height
                    stateCounts.forEach(
                        function(d,i){ 
                            var v={};
                            //Javascript has inline conditional statement. So below statement is equivalent to 
                            //if(total == 0){ return 0} else { return d/total}
                            
                            v.state = heatmapdata.state[i];
                            v.heatmapdata = heatmapdata.data[i];
                            
                            v.percent = (total == 0 ? 0 : d/total); 
                            v.value=d;
                            
                            //buffMargin is the space left for each state's rectugular box 
                            v.height=Math.max(v.percent*(totalHeight-startHeight-2*buffMargin*stateCounts.length), minHeight);
                            (v.height==minHeight ? leftoverHeight-=minHeight : neededHeight+=v.height );
                            ret.push(v);
                        }
                    );

                    var scaleFact=leftoverHeight/Math.max(neededHeight,1), sum=0;

                    ret.forEach(
                       function(d){ 
                            d.percent = scaleFact*d.percent; 
                            d.height=(d.height==minHeight? minHeight : d.height*scaleFact);
                            d.middle=sum+buffMargin+d.height/2;
                            d.y=startHeight + d.middle - d.percent*(totalHeight-startHeight-2*buffMargin*stateCounts.length)/2;
                            d.h= d.percent*(totalHeight-startHeight-2*buffMargin*stateCounts.length);
                            d.percent = (total == 0 ? 0 : d.value/total).toFixed(3);
                            sum+=2*buffMargin+d.height;
                       }
                    );
                    return ret;
                }
                
                vis.mainBars = [ 
                    calculatePosition( data.data[0].map(function(d){ return (d3.sum(d)).toFixed(0);}), 0, height, buffMargin, minHeight,heatmapdata),
                    calculatePosition( data.data[1].map(function(d){ return (d3.sum(d)).toFixed(0);}), 0, height, buffMargin, minHeight,heatmapdata)
                ];
                
                
                vis.subBars = [[],[]];

                //remember that forEach function will require both datum and index

                //determine all the bars for state transitions
                //************dont understand bar.y and bar.y+bar.h
                vis.mainBars.forEach(function(pos,p){
                    pos.forEach(function(bar, i){	
                        calculatePosition(data.data[p][i], bar.y, bar.y+bar.h, 0, 0,heatmapdata).forEach(function(sBar,j){ 
                            sBar.key1=(p==0 ? i : j); 
                            sBar.key2=(p==0 ? j : i); 
                            vis.subBars[p].push(sBar); 
                        });
                    });
                });
                vis.subBars.forEach(function(sBar){
                    sBar.sort(function(a,b){ 
                        return (a.key1 < b.key1 ? -1 : a.key1 > b.key1 ? 
                                1 : a.key2 < b.key2 ? -1 : a.key2 > b.key2 ? 1: 0 )});
                });
                
                vis.edges = vis.subBars[0].map(function(p,i){
                    return {
                        key1: p.key1,
                        key2: p.key2,
                        y1:p.y,
                        y2:vis.subBars[1][i].y,
                        h1:p.h,
                        h2:vis.subBars[1][i].h
                    };
                });
                vis.keys=data.keys;
                //console.log(vis);
                return vis;
                }
              

                function arcTween(a) {
                    var i = d3.interpolate(this._current, a);
                    this._current = i(0);
                    return function(t) {
                        return edgePolygon(i(t));
                    };
                }

            //----FUNCTIONS - Draw the svgs----------------------

                function drawPart(data, id, p){
                    d3.select("#"+id).append("g").attr("class","part"+p)
                        .attr("transform","translate("+( p*(barWidth+barSeparator))+",0)");

                    d3.select("#"+id).select(".part"+p).append("g").attr("class","subbars");
                    d3.select("#"+id).select(".part"+p).append("g").attr("class","mainbars");
                    d3.select("#"+id).select(".part"+p).append("g").attr("class","mysubbars");
                     
                    
                    

                    var mainbar = d3.select("#"+id).select(".part"+p).select(".mainbars")
                        .selectAll(".mainbar").data(data.mainBars[p])
                        .enter()
                            .append("g").attr("class","mainbar");
                    var test = [];
                    data.mainBars[p].forEach(function(d){test.push(d.heatmapdata)});
                    
                    
                    var row = mainbar.append("g").attr("class","heatmap").attr("y",function(d){return d.middle;})
                        .attr("transform",function(d){var temp = d.middle-5; return "translate(0,"+temp+")"}).data(test);
             
                    var col = row.selectAll(".cell")
                        .data(function(d) {
                            var temp = [];
                            
                            for(var k in d){
                               temp.push(d[k]);
                            };
                            ;
                            return temp;
                            
                        }).enter().append('rect').attr("class","cell").attr("x", function(d,i){return ((stateTextMargin[p]+20)+heatmapSize*i)})
                        .attr("width",heatmapSize)
                        .attr("height",heatmapSize).style("fill","#ca6d6c").style("opacity",function(d){return d});
                       
                    mainbar.append("rect").attr("class","mainrect")
                        .attr("x", 0).attr("y",function(d){ return d.middle-d.height; })
                        .attr("width",barWidth).attr("height",function(d){ return d.height; })
                        .style("shape-rendering","auto")
                    //changed stroke-width to 0 to remove the light background image
                        .style("fill-opacity",0).style("stroke-width",0)
                        .style("stroke","black").style("stroke-opacity",0);
                    
                    mainbar.append("text").attr("class","barlabel")
                        .attr("x", stateTextMargin[p]).attr("y",function(d){ return d.middle+5;})
                        .text(function(d,i){ return data.keys[p][i];})
                        .attr("text-anchor","start" );
                    
                    mainbar.append("text").attr("class","barvalue")
                        .attr("x", countTextMargin[p]).attr("y",function(d){return d.middle+5;})
                        .text(function(d,i){ return d.value ;})
                        .attr("text-anchor","end");
                   
                            

                                      
                    mainbar.append("text").attr("class","barpercent")
                        .attr("x", percentTextMargin[p]).attr("y",function(d){ return d.middle+5;})
                        .text(function(d,i){ return "( "+Math.round(100*d.percent)+"%)" ;})
                        .attr("text-anchor","end").style("fill","grey");


                    d3.select("#"+id).select(".part"+p).select(".subbars")
                        .selectAll(".subbar").data(data.subBars[p]).enter()
                        .append("rect").attr("class","subbar")
                        .attr("x", 0).attr("y",function(d){ return d.y})
                        .attr("width",barWidth).attr("height",function(d){ return d.h})
                        .style("fill",function(d){ return colors[d.key1];});

                    d3.select("#"+id).select(".part"+p).select(".mysubbars")
                        .selectAll(".mysubbar").data(data.subBars[p]).enter()
                        .append("rect").attr("class","mysubbar")
                        .attr("x",-1*-p == 0?stateTextMargin[p]-25:percentTextMargin[p]+10).attr("y",function(d){ return d.y})
                        .attr("width",barWidth).attr("height",function(d){ return d.h})
                        .style("fill",function(d){ return colors[d.key1];});
 
                   
                
                    
                }

                function drawEdges(data, id){
                    d3.select("#"+id).append("g").attr("class","edges").attr("transform","translate("+ barWidth+",0)");

                    d3.select("#"+id).select(".edges").selectAll(".edge")
                        .data(data.edges).enter().append("polygon").attr("class","edge")
                        .attr("points", edgePolygon).style("fill",function(d){ return colors[d.key1];})
                        .style("opacity",0.5).each(function(d) { this._current = d; });	
                    
                }	

                function drawHeader(header, id){
                    d3.select("#"+id).append("g").attr("class","header").append("text").text(header[2])//title of the bipartite graph
                        .style("font-size","20").attr("x",(barSeparator/2)+20).attr("y",-20).style("text-anchor","middle")
                        .style("font-weight","bold");

                    [0,1].forEach(function(d){
                        var h = d3.select("#"+id).select(".part"+d).append("g").attr("class","header");

                        h.append("text").attr("class","state").text(header[d])
                            .style("fill","grey").attr("transform","translate("+(stateTextMargin[d]+10)+",-5) rotate(-90)");
                        
                        
                        h.selectAll(".marks").data(heatmapdata.mark).enter().append("text").attr("class","marks").style("fill","grey")
                            .text(function(d,i){return d}).style("font-size","11px")
                            .attr("transform",function(mark,i){return "translate("+(stateTextMargin[d]+heatmapSize*i+30)+",-5) rotate(-90)"});
                      

                        h.append("text").text("Regions").attr("x", (countTextMargin[d]-10))
                            .attr("y", -5).style("fill","grey").style("text-anchor", "right");

                        h.append("line").attr("x1",stateTextMargin[d]-10).attr("y1", -2)
                            .attr("x2",percentTextMargin[d]+10).attr("y2", -2).style("stroke","grey")
                            .style("stroke-width","1").style("shape-rendering","crispEdges");
                    });
                }

                function edgePolygon(d){
                    return [0, d.y1, barSeparator, d.y2, barSeparator, d.y2+d.h2, 0, d.y1+d.h1].join(" ");
                }	




            //------FUNCTIONS - Generate transitions using newly generated svg objects----------------------------------
                function transitionPart(data, id, p){
                    var mainbar = d3.select("#"+id).select(".part"+p).select(".mainbars")
                        .selectAll(".mainbar").data(data.mainBars[p]);


                    mainbar.select(".mainrect").transition().duration(500)
                        .attr("y",function(d){ return d.middle-d.height/2;})
                        .attr("height",function(d){ return d.height;});
              
                    
                    mainbar.select(".heatmap").transition().duration(500)
                        .attr("transform",function(d){return "translate(0,"+(d.middle-5)+")"});
                    
                    mainbar.select(".barlabel").transition().duration(500)
                        .attr("y",function(d){ return d.middle+5;});
                    

                    mainbar.select(".barvalue").transition().duration(500)
                        .attr("y",function(d){ return d.middle+5;}).text(function(d,i){ return d.value ;});

                    mainbar.select(".barpercent").transition().duration(500)
                        .attr("y",function(d){ return d.middle+5;})
                        .text(function(d,i){ return "( "+Math.round(100*d.percent)+"%)" ;});

                    var mybars = d3.select("#"+id).select(".part"+p).select(".mybars")
                        .selectAll(".mybars").data(data.mainBars[p]);

                    mybars.select(".mainrect").transition().duration(500)
                        .attr("y",function(d){ return d.middle-d.height/2;})
                        .attr("height",function(d){return d.height;});

                    d3.select("#"+id).select(".part"+p).select(".mysubbars")
                        .selectAll(".mysubbar").data(data.subBars[p])
                        .transition().duration(500)
                        .attr("y",function(d){ return d.y}).attr("height",function(d){ return d.h});

                    d3.select("#"+id).select(".part"+p).select(".subbars")
                        .selectAll(".subbar").data(data.subBars[p])
                        .transition().duration(500)
                        .attr("y",function(d){ return d.y}).attr("height",function(d){ return d.h});
                }

                function transitionEdges(data, id){
                    d3.select("#"+id).append("g").attr("class","edges").attr("transform","translate("+ barWidth+",0)");

                    d3.select("#"+id).select(".edges").selectAll(".edge").data(data.edges)
                        .transition().duration(500)
                        .attrTween("points", arcTween)
                        .style("opacity",function(d){ return (d.h1 ==0 || d.h2 == 0 ? 0 : 0.5);});	
                }



                function transition(data, id){
                    transitionPart(data, id, 0);
                    transitionPart(data, id, 1);
                    transitionEdges(data, id);
                }




                //-----Compile all the functions 1) Draw all the SVGs 2) Perform transition-------------
                bP.draw = function(data, svg){
                    data.forEach(function(biP,s){
                        //group element with id = transition2
                        //transformation applied to the group element applies to all child element contained inside. It basically shifts the svgs 660 units by x
                        svg.append("g")
                            .attr("id", biP.id)
                            .attr("transform","translate("+ (plotSeperators*s)+",0)");
                        
                        
                        var visData = visualize(biP.data);
                        console.log(visData);
                        drawPart(visData, biP.id, 0);
                        drawPart(visData, biP.id, 1); 
                        drawEdges(visData, biP.id);
                        drawHeader(biP.header, biP.id);

                        [0,1].forEach(function(p){			
                            
                            d3.select("#"+biP.id)
                                .select(".part"+p)
                                .select(".mainbars")
                                .selectAll(".mainbar")
                                .on("click",function(d, i){selectedBar = i;selectedState = p; return bP.selectSegment(data, p, i); });
                                
//                       
                            
                            d3.select("#"+biP.id)
                                .select(".part"+p)
                                .select(".mainbars")
                                .selectAll(".mainbar")
                                .select(".heatmap")
                                .selectAll(".cell")
                                .on("mouseover",function(d,i){
                                 
                                    var h = d3.select("#"+biP.id).select(".part"+p).select(".header");
                                    h.selectAll(".marks").filter(function(d,s){return (s==i)}).style("fill","red").style("font-size","13");
                                })
                                .on("mouseout",function(d,i){
                                    
                                    var h = d3.select("#"+biP.id).select(".part"+p).select(".header");
                                    h.selectAll(".marks").filter(function(d,s){return (s==i)}).style("fill","grey").style("font-size","10");
                            
                            });
                            
                            //take the data and determine the edges to filter 
//                            var edgeFilters = d3.select("#"+biP.id)
//                                .select(".part"+p)
//                                .select(".mainbars")
//                                .selectAll(".mainbar")
//                                .on("click",function(d, i){ return bP.selectSegment(data, p, i); })
//                            

                                //.on('mouseout', function(d, i){ return bP.deSelectSegment(data, p, i); });
//                            d3.select("#"+biP.id)
//                                .select(".edges")
//                                .selectAll(".edge")
//                                .on("mouseover",function(d,i){return bP.selectEdge(data, p, i);});
//                            //    .on("dblclick",function(d,i){return bP.deSelectEdge(data, p, i);});


                            d3.select("#button1")
                                .on("click",function(d, i){ return bP.deSelectSegment(data, p, i); });	
                            
                        });
                        
                         d3.select("#"+biP.id)
                                .select(".edges")
                                .selectAll(".edge")
                                .on("mouseover",function(d,i){return bP.selectEdge(data, i);})
                                .on("mouseout",function(d,i){return bP.deSelectEdge(data, i);});
                        d3.select("#"+biP.id)
                                .select(".edges")
                                .selectAll(".edge")
                                .on("click",function(d,i){return bP.selectEdgeGetRegions(data, i);});
                                
                        
                    });	
                }

                bP.selectSegment = function(data, m, s){
                
                    data.forEach(function(k){
                        var newdata =  {keys:[], data:[]};	

                        newdata.keys = k.data.keys.map( function(d){ return d;});

                        newdata.data[m] = k.data.data[m].map( function(d){ return d;});

                        newdata.data[1-m] = k.data.data[1-m]
                            .map( function(v){ return v.map(function(d, i){ return (s==i ? d : 0);}); });
                        
                        transition(visualize(newdata), k.id);

//                        var selectedBar = d3.select("#"+k.id).select(".part"+m).select(".mainbars")
//                            .selectAll(".mainbar").filter(function(d,i){ return (i==s);});
//                        //console.log(data)
//                        selectedBar.select(".mainrect").style("stroke-opacity",1);			
//                        selectedBar.select(".barlabel").style('font-weight','bold');
//                        selectedBar.select(".barvalue").style('font-weight','bold');
//                        selectedBar.select(".barpercent").style('font-weight','bold');
//                        //console.log(s+1)
                    });
                }	

                bP.selectEdge = function(data, s){
                   if(selectedState == 0){selectedState="key1"};
                    if(selectedState==1){selectedState="key2"};
                    data.forEach(function(k){
                        
                     
                        var selectEdge = d3.select("#"+k.id).select(".edges").selectAll(".edge")
                            .filter(function(d,i){return (i==s && d[selectedState] == selectedBar)});
                        //console.log(s)
                        selectEdge.style("opacity",0.9).style("stroke","grey")
                        });
                }
               

                 bP.deSelectEdge = function(data, s){
                 
                       data.forEach(function(k){
                        
                       var selectEdge = d3.select("#"+k.id).select(".edges").selectAll(".edge")
                            .filter(function(d,i){return (i==s && d[selectedState] == selectedBar)});
                        //console.log(selectEdge)
                        selectEdge.style("opacity",0.5).style("stroke","none")
                    });
                }
                  bP.selectEdgeGetRegions = function(data, s){
                   
                    data.forEach(function(k){
                        
                     
                        var selectEdge = d3.select("#"+k.id).select(".edges").selectAll(".edge")
                            .filter(function(d,i){return (i==s && d[selectedState] == selectedBar)});
                        
                        selectEdge.style("opacity",0.9).style("stroke","grey").filter(function(d,i){console.log(d)});
                        });
                }
                 
                bP.deSelectSegment = function(data, m, s){
                    data.forEach(function(k){
                        transition(visualize(k.data), k.id);
//
//                        var selectedBar = d3.select("#"+k.id).select(".part"+m).select(".mainbars")
//                            .selectAll(".mainbar").filter(function(d,i){ return (i==s);});
//
//                        selectedBar.select(".mainrect").style("stroke-opacity",0);			
//                        selectedBar.select(".barlabel").style('font-weight','normal');
//                        selectedBar.select(".barvalue").style('font-weight','normal');
//                        selectedBar.select(".barpercent").style('font-weight','normal');
                    });		
                }


                var data1 = scope.bipdt;
                var heatmapFileData = scope.heatmapdt;
    
                
                //----HEATMAP data
             
          
                var heatmapdata = {};
      
                heatmapdata.mark = (heatmapFileData.map(function(d){return Object.keys(d)})).shift();//row names
                heatmapdata.state = heatmapFileData.map(function(d){return d["state (Emission order)"]});//col names
                heatmapdata.mark.shift();
                heatmapdata.data = heatmapFileData.map(function(d) {delete d["state (Emission order)"]; return d});
                        
                
                var data = [ 
                    //{data:bP.partData(data2,2), id:'Transition1', header:["State1", "State2", "State Transitions"]},
                    {data:bP.partData(data1,2), id:'Transition2', header:["State1", "State2", "State Transitions"]}
                    //{data:bP.partData(sales_data,2), id:'SalesAttempts', header:["Channel","State", "Sales Attempts"]},
                    //{data:bP.partData(sales_data,3), id:'Sales', header:["Channel","State", "Sales"]}

            ];
                
                
                //------Data visualization position control --------------------
                var barWidth=18, barSeparator=250, height=400, buffMargin=1, minHeight=20, plotSeperators = 800;
                var stateTextMargin=[-160-5*heatmapdata.mark.length, 25], countTextMargin=[-50, 130+5*heatmapdata.mark.length];
                var percentTextMargin=[-3, 180+5*heatmapdata.mark.length], heatmapSize=12; 
                var width = data.length*900, height = 910, margin ={b:0, t:80, l:300, r:50};

                var svg = d3.select("bipartite-chart")
                    .append("svg").attr('width',width).attr('height',(height+margin.b+margin.t))
                    .append("g").attr("transform","translate("+ margin.l+","+margin.t+")");


            bP.draw(data, svg);
        }
            
        
        return {
            link: link,
            restrict: 'E',
            scope: {'bipdt': "=",
                    'heatmapdts': "=",
                    'heatmapdt': "="
                   }

        };
});




myApp.controller('bipartiteChartCtrl', function($scope) {
   $scope.bipdt =  [[7, 3, 2], [12, 1, 33], [11, 11, 109], [7, 12, 5], [12, 12, 200], [15, 1, 72], [3, 7, 9], [2, 5, 137], [8, 5, 21], [6, 7, 16], [5, 5, 1266], [11, 5, 29], [10, 7, 2], [7, 6, 24], [14, 1, 6], [13, 7, 87], [1, 1, 1611], [8, 15, 32], [3, 2, 17], [2, 6, 10], [9, 14, 93], [8, 2, 1], [4, 5, 731], [10, 13, 5], [7, 5, 546], [14, 15, 6304], [12, 11, 20], [15, 14, 1866], [14, 2, 5], [13, 10, 3], [4, 15, 218], [3, 1, 3], [2, 11, 37], [9, 9, 125], [5, 14, 356], [10, 14, 50], [11, 15, 207], [15, 13, 7], [13, 13, 484], [2, 1, 1999], [1, 15, 280], [8, 9, 38], [2, 12, 63], [5, 1, 6], [7, 2, 422], [6, 14, 3], [12, 2, 52], [11, 10, 82], [7, 15, 2873], [14, 5, 162], [12, 13, 186], [1, 5, 139], [3, 6, 3], [2, 2, 1691], [1, 10, 11], [10, 9, 2], [9, 7, 9], [5, 4, 5], [7, 1, 79], [12, 7, 92], [15, 7, 564], [3, 5, 3], [2, 7, 763], [4, 6, 16], [10, 10, 2], [9, 2, 2], [5, 7, 338], [14, 12, 4], [15, 9, 82], [13, 9, 1], [1, 3, 2], [2, 8, 4], [9, 8, 21], [5, 13, 1], [10, 15, 47], [6, 2, 1], [11, 14, 525], [7, 11, 2], [14, 9, 3], [15, 12, 1], [13, 12, 39], [1, 14, 117], [2, 13, 39], [6, 15, 26], [11, 13, 114], [7, 14, 436], [13, 2, 18], [12, 14, 406], [15, 3, 2], [13, 15, 1832], [2, 3, 19], [1, 9, 2], [8, 7, 2], [2, 14, 341], [6, 5, 43], [11, 7, 74], [10, 5, 11], [7, 13, 16], [14, 7, 120], [13, 5, 56], [1, 7, 27], [5, 9, 10], [4, 7, 24], [10, 11, 1], [9, 1, 14], [6, 6, 20], [5, 6, 8], [11, 2, 106], [7, 7, 1613], [14, 13, 30], [12, 5, 16], [15, 8, 1], [15, 5, 685], [1, 2, 22], [8, 14, 10], [3, 3, 13], [2, 9, 12], [9, 15, 1465], [5, 12, 2], [4, 4, 130], [10, 12, 1], [6, 3, 2], [11, 1, 240], [14, 14, 1795], [12, 10, 9], [15, 15, 46349], [13, 11, 2], [1, 13, 7], [4, 14, 6], [2, 10, 32], [5, 15, 2810], [10, 1, 41], [11, 12, 134], [7, 9, 18], [13, 1, 7], [12, 15, 221], [15, 2, 56], [13, 14, 2019], [8, 8, 11], [2, 15, 655], [9, 5, 19], [5, 2, 33], [10, 2, 4]];
   
   $scope.salesdata2 =  [["1", "1", "8"], ["2", "1", "3"], ["3", "1", "0"], ["4", "1", "0"], ["5", "1", "1"], ["6", "1", "0"], ["7", "1", "1"], ["8", "1", "0"], ["9", "1", "16"], ["10", "1", "0"], ["11", "1", "0"], ["12", "1", "0"], ["13", "1", "0"], ["14", "1", "0"], ["15", "1", "67"], ["1", "2", "0"], ["2", "2", "7"], ["3", "2", "0"], ["4", "2", "0"], ["5", "2", "1"], ["6", "2", "0"], ["7", "2", "4"], ["8", "2", "0"], ["9", "2", "0"], ["10", "2", "0"], ["11", "2", "0"], ["12", "2", "0"], ["13", "2", "0"], ["14", "2", "0"], ["15", "2", "6"], ["1", "3", "0"], ["2", "3", "0"], ["3", "3", "0"], ["4", "3", "0"], ["5", "3", "0"], ["6", "3", "0"], ["7", "3", "0"], ["8", "3", "0"], ["9", "3", "0"], ["10", "3", "0"], ["11", "3", "0"], ["12", "3", "0"], ["13", "3", "0"], ["14", "3", "0"], ["15", "3", "0"], ["1", "4", "0"], ["2", "4", "0"], ["3", "4", "0"], ["4", "4", "623"], ["5", "4", "80"], ["6", "4", "2"], ["7", "4", "0"], ["8", "4", "42"], ["9", "4", "0"], ["10", "4", "0"], ["11", "4", "0"], ["12", "4", "0"], ["13", "4", "0"], ["14", "4", "0"], ["15", "4", "0"], ["1", "5", "1"], ["2", "5", "0"], ["3", "5", "0"], ["4", "5", "1402"], ["5", "5", "1977"], ["6", "5", "2"], ["7", "5", "4"], ["8", "5", "57"], ["9", "5", "81"], ["10", "5", "0"], ["11", "5", "0"], ["12", "5", "0"], ["13", "5", "1"], ["14", "5", "101"], ["15", "5", "1606"], ["1", "6", "0"], ["2", "6", "0"], ["3", "6", "0"], ["4", "6", "0"], ["5", "6", "0"], ["6", "6", "0"], ["7", "6", "0"], ["8", "6", "0"], ["9", "6", "0"], ["10", "6", "0"], ["11", "6", "0"], ["12", "6", "0"], ["13", "6", "0"], ["14", "6", "0"], ["15", "6", "0"], ["1", "7", "5"], ["2", "7", "11"], ["3", "7", "0"], ["4", "7", "6"], ["5", "7", "146"], ["6", "7", "0"], ["7", "7", "143"], ["8", "7", "0"], ["9", "7", "2"], ["10", "7", "0"], ["11", "7", "0"], ["12", "7", "0"], ["13", "7", "0"], ["14", "7", "15"], ["15", "7", "317"], ["1", "8", "0"], ["2", "8", "0"], ["3", "8", "0"], ["4", "8", "0"], ["5", "8", "0"], ["6", "8", "0"], ["7", "8", "0"], ["8", "8", "17"], ["9", "8", "25"], ["10", "8", "0"], ["11", "8", "0"], ["12", "8", "0"], ["13", "8", "0"], ["14", "8", "0"], ["15", "8", "6"], ["1", "9", "0"], ["2", "9", "0"], ["3", "9", "0"], ["4", "9", "7"], ["5", "9", "5"], ["6", "9", "0"], ["7", "9", "0"], ["8", "9", "24"], ["9", "9", "354"], ["10", "9", "0"], ["11", "9", "0"], ["12", "9", "0"], ["13", "9", "0"], ["14", "9", "6"], ["15", "9", "474"], ["1", "10", "0"], ["2", "10", "0"], ["3", "10", "0"], ["4", "10", "0"], ["5", "10", "0"], ["6", "10", "0"], ["7", "10", "0"], ["8", "10", "0"], ["9", "10", "1"], ["10", "10", "0"], ["11", "10", "0"], ["12", "10", "0"], ["13", "10", "0"], ["14", "10", "0"], ["15", "10", "2"], ["1", "11", "0"], ["2", "11", "0"], ["3", "11", "0"], ["4", "11", "0"], ["5", "11", "0"], ["6", "11", "0"], ["7", "11", "0"], ["8", "11", "1"], ["9", "11", "0"], ["10", "11", "0"], ["11", "11", "0"], ["12", "11", "0"], ["13", "11", "0"], ["14", "11", "0"], ["15", "11", "2"], ["1", "12", "0"], ["2", "12", "0"], ["3", "12", "0"], ["4", "12", "0"], ["5", "12", "0"], ["6", "12", "0"], ["7", "12", "0"], ["8", "12", "0"], ["9", "12", "0"], ["10", "12", "0"], ["11", "12", "0"], ["12", "12", "0"], ["13", "12", "0"], ["14", "12", "24"], ["15", "12", "0"], ["1", "13", "0"], ["2", "13", "0"], ["3", "13", "0"], ["4", "13", "0"], ["5", "13", "0"], ["6", "13", "0"], ["7", "13", "0"], ["8", "13", "0"], ["9", "13", "3"], ["10", "13", "0"], ["11", "13", "0"], ["12", "13", "0"], ["13", "13", "0"], ["14", "13", "32"], ["15", "13", "19"], ["1", "14", "21"], ["2", "14", "4"], ["3", "14", "0"], ["4", "14", "0"], ["5", "14", "149"], ["6", "14", "0"], ["7", "14", "50"], ["8", "14", "0"], ["9", "14", "111"], ["10", "14", "0"], ["11", "14", "0"], ["12", "14", "0"], ["13", "14", "1"], ["14", "14", "439"], ["15", "14", "3290"], ["1", "15", "165"], ["2", "15", "27"], ["3", "15", "0"], ["4", "15", "258"], ["5", "15", "3105"], ["6", "15", "52"], ["7", "15", "1026"], ["8", "15", "143"], ["9", "15", "3531"], ["10", "15", "4"], ["11", "15", "0"], ["12", "15", "0"], ["13", "15", "10"], ["14", "15", "3555"], ["15", "15", "141211"]];
    
    $scope.heatmapdt = [{"state (Emission order)":"1","H3K4me1":"0.8235024881263174","H3K27ac":"0.14872263727985713","H3K4me3":"0.2535907857313144","H3K27me3":"0.40055513112002933","H3K9me3":"0.2602010843503348","H3K36me3":"0.10567375749675763"},{"state (Emission order)":"2","H3K4me1":"0.9605402241557964","H3K27ac":"0.9567695533317023","H3K4me3":"0.8657700287400797","H3K27me3":"0.3973751898591612","H3K9me3":"0.1389409252065668","H3K36me3":"0.09406127313604135"},{"state (Emission order)":"3","H3K4me1":"0.8962397514424032","H3K27ac":"0.8764585623251833","H3K4me3":"0.40231417616425563","H3K27me3":"0.0743939604022732","H3K9me3":"0.1284741802014215","H3K36me3":"0.4316738735030171"},{"state (Emission order)":"4","H3K4me1":"0.05552114804487842","H3K27ac":"0.15398967605421643","H3K4me3":"0.021623571795320106","H3K27me3":"0.00877134144669693","H3K9me3":"0.016820227341697188","H3K36me3":"0.011066934574250694"},{"state (Emission order)":"5","H3K4me1":"0.13521866763924742","H3K27ac":"0.7630948676662678","H3K4me3":"0.14155113873247913","H3K27me3":"0.5925967201849474","H3K9me3":"0.23940646472534538","H3K36me3":"0.1424711496610505"},{"state (Emission order)":"6","H3K4me1":"0.011563848294429746","H3K27ac":"0.023598196676337387","H3K4me3":"0.004352358825136244","H3K27me3":"0.5729332203250314","H3K9me3":"0.05663116608732244","H3K36me3":"0.06822988930654113"},{"state (Emission order)":"7","H3K4me1":"5.790480507120194E-5","H3K27ac":"1.1380042719601419E-4","H3K4me3":"1.3232764398277662E-4","H3K27me3":"5.969146593273282E-4","H3K9me3":"3.4213689832706415E-4","H3K36me3":"2.044047168262089E-4"},{"state (Emission order)":"8","H3K4me1":"0.031627923469215426","H3K27ac":"0.05866910850911305","H3K4me3":"0.19785903461272158","H3K27me3":"0.8383412891550712","H3K9me3":"0.8206629410062976","H3K36me3":"0.11061097234406517"},{"state (Emission order)":"9","H3K4me1":"0.003798994214624924","H3K27ac":"0.006723762209469473","H3K4me3":"0.010592972222527128","H3K27me3":"0.019795603733028386","H3K9me3":"0.024179768571557257","H3K36me3":"0.01646568307381199"},{"state (Emission order)":"10","H3K4me1":"0.042422469529562946","H3K27ac":"0.09130494158809216","H3K4me3":"0.28643251758440247","H3K27me3":"0.14893574920682098","H3K9me3":"0.689889272869103","H3K36me3":"0.7775078763367662"},{"state (Emission order)":"11","H3K4me1":"0.0185269463735315","H3K27ac":"0.02639581911493431","H3K4me3":"0.019187594366051875","H3K27me3":"0.019609890040962124","H3K9me3":"0.0296157622428735","H3K36me3":"0.2885104135915723"},{"state (Emission order)":"12","H3K4me1":"0.12480997246229701","H3K27ac":"0.6618855821236922","H3K4me3":"0.11951650736061857","H3K27me3":"0.07957418136141352","H3K9me3":"0.11055817296750022","H3K36me3":"0.8390103425735868"},{"state (Emission order)":"13","H3K4me1":"0.021279262760004497","H3K27ac":"0.9191042925092444","H3K4me3":"0.9328339019990806","H3K27me3":"0.2079889871455402","H3K9me3":"0.08037139382853536","H3K36me3":"0.08143700038278126"},{"state (Emission order)":"14","H3K4me1":"0.023277937455322684","H3K27ac":"0.06271654715546418","H3K4me3":"0.9345400155560556","H3K27me3":"0.5080545216056443","H3K9me3":"0.08782307505997593","H3K36me3":"0.08192852367738121"},{"state (Emission order)":"15","H3K4me1":"0.01344337905066981","H3K27ac":"0.030092587932846766","H3K4me3":"0.14956367554353095","H3K27me3":"0.04069691606721172","H3K9me3":"0.749721482218611","H3K36me3":"0.024116892584696514"}];
    
//Having trouble injecting the data into directive. 
//    d3.tsv("emissions_15.txt",function(err,data){
//        if(err){throw err;}
//        $scope.heatmapdts =data;
//        $scope.$apply();
//    });
//    
});
   
            
    
}());
                 
    


