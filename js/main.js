/**
 * Created by Johannes on 02.12.2014.
 */


var client = new Dropbox.Client({ key: "f629oxf1xdmgu0g" });
var graph;

var host = "joplapp.github.io";
if ((host == window.location.host) && (window.location.protocol != "https:")){
    window.location.protocol = "https";
}

$( document ).ready(authenticate);

$(document).ready(function() {
        $("#privacy-policy-link").click(function (e) {
            $("#privacy-policy").toggle();

            // stop event and scroll to bottom to make policy visible (yeah we're that transparent!)
            e.preventDefault();
            $("html, body").animate({ scrollTop: $(document).height() }, "slow");
        });
});

function authenticate(){
    // Try to use cached credentials.
    client.authenticate({interactive: false}, function(error, client) {
        if (error) {
            return showError(error);
        }
        if (client.isAuthenticated()) {
            // Cached credentials.
            loadGraph();
        } else {
            // show and set up the "Sign into Dropbox" button
            $('#dropbox-connect').show();
            $('.btn-dropbox').click(function() {
                client.authenticate(function(error) {
                    if (error) {
                        return showError(error);
                    }
                    loadGraph();
                });
            });
        }
    });
}

function loadGraph(){
    $("#dropbox-connect").hide();
    $("#progress-box").show();
    var totalBytes = 0;

    client.getAccountInfo(function (error, accountInfo) {
        totalBytes = accountInfo.usedQuota;
        console.log(totalBytes);
    });

    var tree = new Tree("home");

    loadDelta(tree, undefined, function(){
        setTimeout(function(){
            $("#progress-box").hide();
            $("#hint").show();
            finalizeChart(tree);
        }, 300);
    }, function (currentProgress) {
        if (totalBytes == 0) {
            return;
        }
        if(currentProgress){
            loadChartStep(tree, totalBytes - currentProgress);
        }
        var progress = Math.round(currentProgress * 10000 / totalBytes) / 100;
        $('#progress-bar').text(progress+"%");
        $('#progress-bar').css("width",progress+"%");
    }, 0, 500000);
}

var followPath = function(tree, path, method, attrib){
    var folders = path.split("/");
    var node = tree, newNode;

    for(var i=1; i<folders.length-1; i++){
        newNode = node.getNode(folders[i]);
        if (!newNode) {
            newNode = node.addNode(folders[i]);
        }
        node = newNode;
    }

    node[method](folders.pop(), attrib);
};

var addFolder = function(tree, path){
    // console.log(path+ " was added.");
    followPath(tree, path, "addNode");
};
var addFile = function(tree, path, size){
    // console.log(path+ " was added.");
    followPath(tree, path, "addChild", size);
};

var loadDelta = function (tree, cursor, done, progress, currentBytes, counter) {
    progress(currentBytes);

    if(counter < 0){
        done();
        return;
    }
    client.delta(cursor, function(err, result){
        if(!result.changes){
            done();
            return;
        }

        result.changes.forEach(function(item){
            if(item.stat.isFolder) {
                addFolder(tree, item.path)
            } else {
                addFile(tree, item.path, item.stat.size);
                currentBytes += item.stat.size;
            }
        });
        if(result.shouldPullAgain) {
            loadDelta(tree, result.cursorTag, done, progress, currentBytes, counter - result.changes.length)
        } else {
            done();
        }
    })
};

var MAX_NUM_LEAVES = 25;

var lastTime;
function loadChartStep(tree, missingBytes) {
    var now = Date.now();
    if(lastTime && now - lastTime < 100) {  //prevent updating to often
        return;
    }
    lastTime = now;

    tree.addChild("waiting", missingBytes);  // add additional node with remaining bytes

    tree.computeSize();
    tree.pruneSmallFiles(MAX_NUM_LEAVES);
    tree.computeSize();
    tree.publishChildren();

    graph ? graph.update() : (graph = new DGraph(tree));

    tree.removeChild("waiting", missingBytes);
}

function finalizeChart(tree){
    tree.computeSize();
    tree.pruneSmallFiles(MAX_NUM_LEAVES);
    tree.computeSize();
    tree.publishChildren();

    graph ? graph.update() : (graph = new DGraph(tree));
}

function getReadableFileSizeString(fileSizeInBytes) {

    var i = -1;
    var byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB'];
    do {
        fileSizeInBytes = fileSizeInBytes / 1024;
        i++;
    } while (fileSizeInBytes > 1024);

    return Math.max(fileSizeInBytes, 0.1).toFixed(1) + byteUnits[i];
}

String.prototype.trunc = function(n, endCharsToShow){
    endCharsToShow = endCharsToShow || 0;

    return this.length>n ? this.substr(0,n-(1+endCharsToShow))+'\u2026' + this.substr(-endCharsToShow, endCharsToShow): this;
};