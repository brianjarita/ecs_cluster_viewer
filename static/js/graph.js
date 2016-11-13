function getParameterByName(name, url) {
    if (!url) {
        url = window.location.href;
    }
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function DrawRectangle(svg, x, y, width, height, fill) {
    return svg.rect(x, y-height, width, height).attr({
        fill: fill,
        stroke: "#000",
        strokeWidth: 1
    });
}

var request = new XMLHttpRequest();
request.open('GET', "/api/cluster_info/" + document.location.search, true);

request.onload = function() {
    if (request.status >= 200 && request.status < 400) {
        var colorPallete = ["#a6cee3","#1f78b4","#b2df8a","#33a02c","#fb9a99","#e31a1c","#fdbf6f","#ff7f00","#cab2d6","#6a3d9a","#ffff99","#b15928"],
            clusterName = getParameterByName("cluster"),
            containerIdx = 0,
            data = JSON.parse(request.responseText),
            legendBefore = document.getElementById("legend-end"),
            maxMB = data.maxMB * 1.05,
            paddingTop = 20,
            paddingBottom = 60,
            svg = Snap("#svg-drawing");
            svgHeight = svg.node.clientHeight,
            svgWidth = svg.node.clientWidth,
            realHeight = svgHeight - (paddingTop + paddingBottom)
            rectangleWidth = 40,
            pixelMB = realHeight / maxMB,
            paddingHeight = paddingTop + paddingBottom;
        svg.clear();
        window.data = data;

        // Label the GBs
        for (i=0; i<=maxMB; i=i+1000) {
            var pixelRow = realHeight - Math.ceil(i*pixelMB);
            svg.line(30, pixelRow, svgWidth, pixelRow).attr({
                stroke: "#000",
                strokeWidth: 1
            });
            svg.text(0,pixelRow+3, (i/1000) + " GB").attr({"font-size": "10"});
        }

        Object.values(data.containerInstances).forEach(function (container) {
            // Draw base
            var containerLeft = (containerIdx * 60) + 40,
                totalHeight = realHeight;
            DrawRectangle(svg, containerLeft, totalHeight, rectangleWidth, Math.ceil(container.memory*pixelMB), "#ccc");
            svg.text(containerLeft, svgHeight-40, container.instance).attr({"font-size": "10", "transform": "r90"});

            Object.values(container.tasks).forEach(function (task) {
                var pixelLine = Math.ceil(task.memory * pixelMB);
                DrawRectangle(svg, containerLeft, totalHeight, rectangleWidth, pixelLine, colorPallete[task.color]);
                totalHeight = totalHeight - pixelLine;
            });
            containerIdx = containerIdx + 1;
        });

        for(i=0; i<data.taskDefinitions.length; i=i+1) {
            legendBefore.insertAdjacentHTML("beforebegin",
                '<div class="legend-task"><div class="legend-task-color" style="background-color: ' + colorPallete[i] + '"></div><span>' + data.taskDefinitions[i].name + '</span></div>');
            legendBefore.insertAdjacentHTML("beforebegin",
                '<div class="legend-task"><div class="legend-task-color" style="background-color: ' + colorPallete[i] + '"></div><span>' + data.taskDefinitions[i].name + '</span></div>');
        }
        document.getElementById("main-title").innerHTML = clusterName + " cluster";
        document.title = clusterName + " cluster";


    } else {
        console.log("Failed - No Data");
  }
};

request.onerror = function() {
    console.log("Failed - Connection Error");
};

request.send();
