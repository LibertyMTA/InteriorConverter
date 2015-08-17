$(document).ready(function() {
    $("#converter").submit(function(e) {
        var name = $("#name").val();
        var mapper = $("#mapper").val();
        var id = $("#id").val();

        window.alert(name + "(" + id + ") by " + mapper + " loaded.");
        e.preventDefault();
    });
});
