/**
 * Created by Johannes on 02.12.2014.
 */


var client = new Dropbox.Client({ key: "f629oxf1xdmgu0g" });

function authenticate(){
    client.authenticate(function(error, client) {
        if (error) {
            // Replace with a call to your own error-handling code.
            //
            // Don't forget to return from the callback, so you don't execute the code
            // that assumes everything went well.
            return showError(error);
        }

        // Replace with a call to your own application code.
        //
        // The user authorized your app, and everything went well.
        // client is a Dropbox.Client instance that you can use to make API calls.

        var tree = new Tree("main");

        loadDelta(tree, undefined, function(){
            loadChart(tree)
        }, 200000);
    });
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

var loadDelta = function(tree, cursor, done, counter){
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
            if(item.stat.isFolder){
                addFolder(tree, item.path)
            } else {
                addFile(tree, item.path, item.stat.size)
            }
        });
        if(result.shouldPullAgain) {
            loadDelta(tree, result.cursorTag, done, counter - result.changes.length)
        } else {
            done();
        }
    })
};

function loadChart(tree) {
    initializeChart(tree.toArray());
    console.log(tree.toArray())
}