/**
 * Created by Johannes on 02.12.2014.
 */
"use strict";


var DGraph = function(root){

    this.root = root;

    this.hue = d3.scale.category10();

    this.luminance = d3.scale.sqrt()
        .domain([0, 1e7])
        .clamp(true)
        .range([90, 20]);

    this.initialize();
};

DGraph.prototype = {
    constructor: DGraph,

    initialize: function(){
        var margin = {top: 350, right: 480, bottom: 350, left: 480},
        radius = Math.min(margin.top, margin.right, margin.bottom, margin.left) - 10;

        this.tip = d3.tip()
            .attr('class', 'd3-tip')
            .direction('w')
            .offset([0,-5])
            .html(function(d) {
                return d.name + ": "+ getReadableFileSizeString(d.size);
            });

        var svg = d3.select("#content").append("svg")
            .call(this.tip)
            .attr("width", margin.left + margin.right)
            .attr("height", margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        this.partition = d3.layout.partition()
            .sort(function (a, b) {
                return d3.ascending(a.size, b.size);
            })
            .size([2 * Math.PI, radius]);

        this.arc = d3.svg.arc()
            .startAngle(function (d) {
                return d.x;
            })
            .endAngle(function (d) {
                return d.x + d.dx - .01 / (d.depth + .5);
            })
            .innerRadius(function (d) {
                return radius / 3 * d.depth;
            })
            .outerRadius(function (d) {
                return radius / 3 * (d.depth + 1) - 1;
            });

        // Compute the initial layout on the entire tree to sum sizes.
        // Also compute the full name and fill color for each node,
        // and stash the children so they can be restored as we descend.
        this.partition
            .value(function (d) {
                return d.size;
            })

        this.center = new DGraph.Center(svg.append("g"), this.root, radius, this.zoomOut.bind(this));
        this.path = svg.selectAll("path");

        this.update();

        d3.select(self.frameElement).style("height", margin.top + margin.bottom + "px");
    },

    zoomIn: function(p) {
        if (p.depth > 1) p = p.parent;
        if (!p.children) return;
        this.zoomToRoot(p, p);
    },

    zoomOut: function(p) {
        if (!p.parent) return;
        this.zoomToRoot(p.parent, p);
    },

    // Zoom to the specified new root.
    zoomToRoot: function(root, p) {
        if (document.documentElement.__transition__) return;

        // Rescale outside angles to match the new layout.
        var enterArc,
            exitArc,
            outsideAngle = d3.scale.linear().domain([0, 2 * Math.PI]);

        function insideArc(d) {
            return p.key > d.key
                ? {depth: d.depth - 1, x: 0, dx: 0} : p.key < d.key
                ? {depth: d.depth - 1, x: 2 * Math.PI, dx: 0}
                : {depth: 0, x: 0, dx: 2 * Math.PI};
        }

        function outsideArc(d) {
            return {depth: d.depth + 1, x: outsideAngle(d.x), dx: outsideAngle(d.x + d.dx) - outsideAngle(d.x)};
        }

        this.center.update(root);

        // When zooming in, arcs enter from the outside and exit to the inside.
        // Entering outside arcs start from the old layout.
        if (root === p) enterArc = outsideArc, exitArc = insideArc, outsideAngle.range([p.x, p.x + p.dx]);

        this.path = this.path.data(this.partition.nodes(root).slice(1), function (d) {
            return d.key;
        });

        // When zooming out, arcs enter from the inside and exit to the outside.
        // Exiting outside arcs transition to the new layout.
        if (root !== p) enterArc = insideArc, exitArc = outsideArc, outsideAngle.range([p.x, p.x + p.dx]);

        var that = this;
        d3.transition().duration(d3.event.altKey ? 7500 : 750).each(function () {
            that.path.exit().transition()
                .style("fill-opacity", function (d) {
                    return d.depth === 1 + (root === p) ? 1 : 0;
                })
                .attrTween("d", function (d) {
                    return arcTween.call(this, exitArc(d));
                })
                .remove();

            that.path.enter().append("path")
                .style("fill-opacity", function (d) {
                    return d.depth === 2 - (root === p) ? 1 : 0;
                })
                .style("fill", function (d) {
                    return d.fill;
                })
                .on("click", that.zoomIn.bind(that))
                .each(function (d) {
                    this._current = enterArc(d);
                });

            that.path.on('mouseover', that.tip.show)
                .on('mouseout', that.tip.hide);

            that.path.transition()
                .style("fill-opacity", 1)
                .attrTween("d", function (d) {
                    return arcTween.call(this, updateArc(d));
                });
        });

        function arcTween(b) {
            var i = d3.interpolate(this._current, b);
            this._current = i(0);
            return function (t) {
                return that.arc(i(t));
            };
        }

        function updateArc(d) {
            return {depth: d.depth, x: d.x, dx: d.dx};
        }
    },

    update: function(){
        var that = this;

        function fill(d) {
            var p = d;
            while (p.depth > 1) p = p.parent;
            var c = d3.lab(that.hue(p.name));
            c.l = that.luminance(d.size);
            return c;
        }
        function updateArc(d) {
            return {depth: d.depth, x: d.x, dx: d.dx};
        }

        this.partition
            .nodes(this.root)
            .forEach(function (d) {
                d._children = d.__children;
            });
        this.partition.children(function (d) {   //make sure to update all children in the next step
            return d._children;
        });
        this.partition.nodes(this.root)
            .forEach(function (d) {
                d.fill = fill(d)
            });
        this.partition.children(function (d, depth) {
            return depth < 2 ? d._children : null;  //reset to only show two inner circles
        });

        this.path = this.path.data(this.partition.nodes(this.root).slice(1), function (d) {
            return d.key;
        });

        this.path.enter().append("path")
            .attr("d", this.arc)
            .on("click", this.zoomIn.bind(this));

        this.path.attr("d", this.arc)
            .style("fill", function (d) {
                return d.fill;
            })
            .each(function (d) {
                this._current = updateArc(d);
            })
            .on('mouseover', this.tip.show)
            .on('mouseout', this.tip.hide);

        this.path.exit().remove();
    }
};

DGraph.Center = function(rootNode, dataRoot, radius, onClick){

    this.rootNode = rootNode;
    this.dataRoot = dataRoot;

    this.initialize(radius, onClick);

};

DGraph.Center.prototype = {
    constructor: DGraph.Center,

    initialize: function(radius, onClick){
        this.center = this.rootNode.append("circle")
            .attr("r", radius / 3)
            .on("click", onClick);

        this.center.append("title")
            .text("zoom out");

        this.centerFolderName = this.rootNode.append("text")
            .attr("class", "centerText")
            .attr("id", "centerFolderName");

        this.centerFolderSize = this.rootNode.append("text")
            .attr("class", "centerText")
            .attr("id", "centerFolderSize")
            .attr("dy", 28);

        this.centerLinkGroup = this.rootNode.append("g");

        this.centerLinkGroup.append('text')
            .attr("dy",48)
            .attr("dx", -75)
            .attr("class", "centerText")
            .attr('font-family', 'FontAwesome')
            .text('\uf08e');

        this.centerLink = this.centerLinkGroup.append("a")
            .attr("target", "_blank");

        this.centerLink.append("text")
            .attr("class", "centerText")
            .attr("id", "centerLink")
            .attr("dx", 5)
            .attr("dy", 47)
            .text("Open in your Dropbox");

        this.update(this.dataRoot);
    },

    update: function(root){
        this.center.datum(root);
        this.centerFolderName.text(root.name.trunc(20,2));
        this.centerFolderSize.text(getReadableFileSizeString(root.size));
        this.centerLink.attr("xlink:href", "http://www.dropbox.com/home"+root.getPath());
    }
};

function getReadableFileSizeString(fileSizeInBytes) {

    var i = -1;
    var byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB'];
    do {
        fileSizeInBytes = fileSizeInBytes / 1024;
        i++;
    } while (fileSizeInBytes > 1024);

    return Math.max(fileSizeInBytes, 0.1).toFixed(1) + byteUnits[i];
}

module.exports = DGraph;