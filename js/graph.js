/**
 * Created by Johannes on 02.12.2014.
 */

function initializeChart(root) {

    var margin = {top: 350, right: 480, bottom: 350, left: 480},
        radius = Math.min(margin.top, margin.right, margin.bottom, margin.left) - 10;

    var hue = d3.scale.category10();

    var luminance = d3.scale.sqrt()
        .domain([0, 1e7])
        .clamp(true)
        .range([90, 20]);

    var tip = d3.tip()
        .attr('class', 'd3-tip')
        .direction('w')
        .offset([0,-5])
        .html(function(d) {
            console.log(d);
            return d.name + ": "+ getReadableFileSizeString(d.size);
        });

    var svg = d3.select("#content").append("svg")
        .call(tip)
        .attr("width", margin.left + margin.right)
        .attr("height", margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var partition = d3.layout.partition()
        .sort(function (a, b) {
            return d3.ascending(a.size, b.size);
        })
        .size([2 * Math.PI, radius]);

    var arc = d3.svg.arc()
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

    console.log(root)
    // Compute the initial layout on the entire tree to sum sizes.
    // Also compute the full name and fill color for each node,
    // and stash the children so they can be restored as we descend.
    partition
        .value(function (d) {
            return d.size;
        })
        .nodes(root)
        .forEach(function (d) {
            d._children = d.children;
            d.fill = fill(d);
        });

    // Now redefine the value function to use the previously-computed sum.
    partition
        .children(function (d, depth) {
            return depth < 2 ? d._children : null;
        })
        .value(function (d) {
            return d.size;
        });

    var elemEnter = svg.append("g");

    var center = elemEnter.append("circle")
        .attr("r", radius / 3)
        .on("click", zoomOut);

    center.append("title")
        .text("zoom out");

    var centerFolderName = elemEnter.append("text")
        .attr("class", "centerText")
        .attr("id", "centerFolderName")
        .text((root.name).trunc(20,2));

    var centerFolderSize = elemEnter.append("text")
        .attr("class", "centerText")
        .attr("id", "centerFolderSize")
        .attr("dy", 28)
        .text(getReadableFileSizeString(root.size));

    var centerLinkGroup = elemEnter.append("g");

    centerLinkGroup.append('text')
        .attr("dy",48)
        .attr("dx", -80)
        .attr("class", "centerText")
        .attr('font-family', 'FontAwesome')
        .text('\uf08e');

    var centerLink = centerLinkGroup.append("a")
        .attr("xlink:href", "http://www.dropbox.com/home"+root.getPath())
        .attr("target", "_blank");

    centerLink.append("text")
        .attr("class", "centerText")
        .attr("id", "centerLink")
        .attr("dy", 47)
        .text("Open in your Dropbox.");

    console.log(partition.nodes(root).slice(1))

    var path = svg.selectAll("path")
        .data(partition.nodes(root).slice(1))
        .enter().append("path")
        .attr("d", arc)
        .style("fill", function (d) {
            return d.fill;
        })
        .each(function (d) {
            this._current = updateArc(d);
        })
        .on("click", zoomIn)
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide);

    path.append("title")
        .text(function(d){
            return d.name + ": "+ getReadableFileSizeString(d.size);
        });

    function zoomIn(p) {
        if (p.depth > 1) p = p.parent;
        if (!p.children) return;
        zoom(p, p);
    }

    function zoomOut(p) {
        if (!p.parent) return;
        zoom(p.parent, p);
    }

    // Zoom to the specified new root.
    function zoom(root, p) {
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

        center.datum(root);
        centerFolderName.text((root.name).trunc(20,2));
        centerFolderSize.text(getReadableFileSizeString(root.size));
        centerLink.attr("xlink:href", "http://www.dropbox.com/home"+root.getPath());

        // When zooming in, arcs enter from the outside and exit to the inside.
        // Entering outside arcs start from the old layout.
        if (root === p) enterArc = outsideArc, exitArc = insideArc, outsideAngle.range([p.x, p.x + p.dx]);

        path = path.data(partition.nodes(root).slice(1), function (d) {
            return d.key;
        });

        // When zooming out, arcs enter from the inside and exit to the outside.
        // Exiting outside arcs transition to the new layout.
        if (root !== p) enterArc = insideArc, exitArc = outsideArc, outsideAngle.range([p.x, p.x + p.dx]);

        d3.transition().duration(d3.event.altKey ? 7500 : 750).each(function () {
            path.exit().transition()
                .style("fill-opacity", function (d) {
                    return d.depth === 1 + (root === p) ? 1 : 0;
                })
                .attrTween("d", function (d) {
                    return arcTween.call(this, exitArc(d));
                })
                .remove();

            path.enter().append("path")
                .style("fill-opacity", function (d) {
                    return d.depth === 2 - (root === p) ? 1 : 0;
                })
                .style("fill", function (d) {
                    return d.fill;
                })
                .on("click", zoomIn)
                .each(function (d) {
                    this._current = enterArc(d);
                });


            path.append("title")
                .text(function(d){
                    return d.name + ": "+ getReadableFileSizeString(d.size);
                });

            path.transition()
                .style("fill-opacity", 1)
                .attrTween("d", function (d) {
                    return arcTween.call(this, updateArc(d));
                });
        });
    }

    function fill(d) {
        var p = d;
        while (p.depth > 1) p = p.parent;
        var c = d3.lab(hue(p.name));
        c.l = luminance(d.size);
        return c;
    }

    function arcTween(b) {
        var i = d3.interpolate(this._current, b);
        this._current = i(0);
        return function (t) {
            return arc(i(t));
        };
    }

    function updateArc(d) {
        return {depth: d.depth, x: d.x, dx: d.dx};
    }

    d3.select(self.frameElement).style("height", margin.top + margin.bottom + "px");

    function update(){
        partition
            .nodes(root)
            .forEach(function (d) {
                d._children = d.__children;
            });
        partition.children(function (d) {   //make sure to update all children in the next step
                return d._children;
            });
        partition.nodes(root)
            .forEach(function (d) {
                d.fill = fill(d)
            });
        partition.children(function (d, depth) {
                return depth < 2 ? d._children : null;  //reset to only show two inner circles
            });

        path = path.data(partition.nodes(root).slice(1), function (d) {
            return d.key;
        });

        path.enter().append("path")
            .attr("d", arc)
            .on("click", zoomIn);

        path.attr("d", arc)
            .style("fill", function (d) {
                return d.fill;
            })
            .each(function (d) {
                this._current = updateArc(d);
            });

        path.append("title")
            .text(function(d){
                return d.name + ": "+ getReadableFileSizeString(d.size);
            });

        path.exit().remove();
    }
    return update;
}