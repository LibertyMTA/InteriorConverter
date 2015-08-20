$(document).ready(function() {
    $("#result").hide();

    $("#result > button").click(function() {
        $("#resultData").empty();
        $("#alerts").empty();
        $("#result").hide();
        $("#content").show();
    });

    var output = function (type, message) {
        $("#alerts").append('<div class="alert alert-' + type + '" role="alert">' + message + '</div>');
    }

    var convertData = function ($item) {
        var posX = Number($item.attr('posX'));
        var posY = Number($item.attr('posY'));
        var posZ = Number($item.attr('posZ'));
        var rotX = Number($item.attr('rotX'));
        var rotY = Number($item.attr('rotY'));
        var rotZ = Number($item.attr('rotZ'));

        return sprintf("Vector3(%.2f, %.2f, %.2f), Vector3(%.2f, %.2f, %.2f)", posX, posY, posZ, rotX || 0, rotY || 0, rotZ || 0);
    }

    $("#converter").submit(function(e) {
        e.preventDefault();

        $("#alerts").empty();
        $("#result").show();
        $("#resultData").hide();
        $("#content").hide();

        var name = $("#name").val();
        var mapper = $("#mapper").val();
        var id = Number($("#id").val());
        var map = $("#map").val();

        // Let's check the meta data for errors
        if (name.length == 0 || mapper.length == 0 || map.length == 0 || id <= 0 || id == NaN) {
            output("danger", "Please fill in the blanks.");
            return false;
        }

        map = map.replace(/edf:definitions=".*"/, "");

        // Load the map
        var xml;
        try {
            xml = $.parseXML(map);
        } catch (err) {
            output("danger", "Your map file is invalid: " + err);
            return false;
        }

        var $xml = $(xml);

        // Find all the required information
        // Carspawns
        var carspawns = []
        var $carspawns = $xml.find("vehicle[id^='carspawn']");
        $carspawns.each(function(i, c) {
            var $cs = $(c)
            if (Number($cs.attr('model')) != 411) {
                output("warning", "Please make sure all your carspawns are marked with Infernuses and not other vehicles.");
                return false;
            }

            carspawns.push("    {Matrix(" + convertData($cs) + ")}");
        });
        var carspawn = carspawns.join(",\n");
        $carspawns.remove();

        // Get the spawn
        var $spawn = $xml.find("ped[id='spawn']");
        if ($spawn.length != 1) {
            output("danger", "A spawn ped was not found.");
            return false;
        }
        var spawn = convertData($spawn);

        // Also the interior
        var interior = Number($spawn.attr("interior")) || 0;
        $spawn.remove();

        // Control panel
        var $control = $xml.find("ped[id='control']");
        if ($control.length != 1) {
            output("danger", "A control panel ped was not found.");
            return false;
        }
        var control = convertData($spawn);
        $control.remove();

        // Entrance
        var $enter = $xml.find("ped[id='enter']");
        if ($enter.length != 1) {
            output("danger", "An entrance door ped was not found.");
            return false;
        }
        var enter = convertData($enter);
        $enter.remove();

        // Wardrobe
        var $closet = $xml.find("ped[id='closet']");
        if ($closet.length != 1) {
            output("danger", "A clothing wardrobe ped was not found.");
            return false;
        }
        var closet = convertData($closet);
        $closet.remove();

        // Chest
        var $chest = $xml.find("object[id='chest']");
        if ($chest.length != 1) {
            output("danger", "A chest was not found.");
            return false;
        }
        var chest = convertData($chest);
        $chest.remove();

        // The collision box
        var $up = $xml.find("object[id='northeasttop']");
        var $down = $xml.find("object[id='southwestbottom']");
        if ($up.length != 1 || $up.length != 1) {
            output("danger", "The collision box definition objects were not found.");
            return false;
        }
        // Small trick here - carry over the data from $down to $up for compatibility with the parsing function
        $up.attr('rotX', $down.attr('posX'));
        $up.attr('rotY', $down.attr('posY'));
        $up.attr('rotZ', $down.attr('posZ'));
        var col = convertData($up);
        $up.remove();
        $down.remove();

        // Garage enter / exit
        var $genter = $xml.find("[id='garageEnter']");
        var $gexit = $xml.find("[id='garageExit']");
        if ($genter.length != 1 || $gexit.length != 1) {
            output("warning", "You did not define garage markers - is this a walk-in garage?");
        }
        if ($genter.prop("tagName") == "marker" || $gexit.prop("tagName") == "marker") {
            output("warning", 'You defined garage doors using markers. While markers are still compatible, the new Liberty Interior Mapping Standard suggests you do them with peds. <a href="http://wiki.libertymta.net/Liberty_Interior_Mapping_Standard">Click here for more information.</a>');
            $genter.attr('posZ', Number($genter.attr('posZ')) + 1);
            $gexit.attr('posZ', Number($gexit.attr('posZ')) + 1);
        }
        var genter = convertData($genter);
        var gexit = convertData($gexit);
        $genter.remove();
        $gexit.remove();

        // Get the objects now
        // Carspawns
        var objects = []
        var $objects = $xml.find("object");
        $objects.each(function(i, o) {
            var $item = $(o)
            if ($item.attr('doublesided') != "true") {
                output("warning", "You have a non-doublesided object. Keep in mind that LibertyHousing automatically makes all objects double-sided.");
            }

            var model = Number($item.attr('model'));
            var posX = Number($item.attr('posX'));
            var posY = Number($item.attr('posY'));
            var posZ = Number($item.attr('posZ'));
            var rotX = Number($item.attr('rotX'));
            var rotY = Number($item.attr('rotY'));
            var rotZ = Number($item.attr('rotZ'));
            var alpha = Number($item.attr('alpha'));

            var str = false;
            if (alpha == 255) {
                str = sprintf("%d, %.2f, %.2f, %.2f, %.2f, %.2f, %.2f", model, posX, posY, posZ, rotX || 0, rotY || 0, rotZ || 0);
            } else {
                str = sprintf("%d, %.2f, %.2f, %.2f, %.2f, %.2f, %.2f, %d", model, posX, posY, posZ, rotX || 0, rotY || 0, rotZ || 0, alpha);
            }

            objects.push("    {" + str + "}");
        });
        var object = objects.join(",\n");
        $objects.remove();

        var $all = $xml.find("*");
        if ($all.length > 0) {
            output("warning", "You have items remaining on your map after all objects and key peds have been processed. Remember that vehicles, markers, removals and extra peds are not retained.");
        }

        // OK, we're all good to go - let's finish up!
        // Get the Lua file template
        $.ajax({
            url: "./interior.txt",
            async: false,
            dataType: "text",
            success: function (data){
                $("#resultData").append(sprintf(data, name, mapper, interior, enter, spawn, closet, control, chest, col, carspawn, "", genter, gexit, id));
            }
        });

        output("success", name + " (" + id + ") by " + mapper + " successfully converted. Please upload this file to the relevant Mantis issue.");

        $("#resultData").show();
    });
});
