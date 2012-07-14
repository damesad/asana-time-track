// forked by: codelovers

(function( $ ){

    var currentHours, currentMinutes, currentSeconds, progressState;
    var saveInterval = 1;

    function incrementer(ct, increment) {
        return function() { ct+=increment; return ct; };
    }
    
    function pad2(number) {
         return (number < 10 ? '0' : '') + number;
    }

    function defaultFormatMilliseconds(millis) {
        var x, seconds, minutes, hours;
        x = millis / 1000;
        seconds = Math.floor(x % 60);
        currentSeconds = seconds;
        x /= 60;
        minutes = Math.floor(x % 60);
        currentMinutes = minutes;
        x /= 60;
        hours = Math.floor(x % 24);
        currentHours = hours;
        // x /= 24;
        // days = Math.floor(x);
        return [pad2(hours), pad2(minutes), pad2(seconds)].join(':');
    }

    //NOTE: This is a the 'lazy func def' pattern described at http://michaux.ca/articles/lazy-function-definition-pattern
    function formatMilliseconds(millis, data) {
        // Use jintervals if available, else default formatter
        var formatter;
        if (typeof jintervals == 'function') {
            formatter = function(millis, data){return jintervals(millis/1000, data.format);};
            
        } else {
            formatter = defaultFormatMilliseconds;
        }
        formatMilliseconds = function(millis, data) {
            return formatter(millis, data);
        };
        return formatMilliseconds(millis, data);
    }

    var methods = {
        
        init: function(options) {
            var defaults = {
                updateInterval: 1000,
                startTime: 0,
                format: '{HH}:{MM}:{SS}',
                formatter: formatMilliseconds
            };
            
            // if (options) { $.extend(settings, options); }
            var settings = $.extend({}, defaults, options);
            
            return this.each(function() {
                var $this = $(this),
                    data = $this.data('stopwatch');
                
                // If the plugin hasn't been initialized yet
                if (!data) {
                    // Setup the stopwatch data
                    data = settings;
                    data.active = false;
                    data.target = $this;
                    data.elapsed = settings.startTime;
                    
                    // create counter
                    data.incrementer = incrementer(data.startTime, data.updateInterval);
                    data.tick_function = function() {
                        var millis = data.incrementer();
                        data.elapsed = millis;
                        data.target.trigger('tick.stopwatch', [millis]);
                        data.target.stopwatch('render');
                    };
                    $this.data('stopwatch', data);
                }
                
            });
        },
        
        start: function() {
            return this.each(function() {
                var $this = $(this),
                    data = $this.data('stopwatch');
                // Mark as active
                data.active = true;
                data.timerID = setInterval(data.tick_function, data.updateInterval);
                $this.data('stopwatch', data);
            });
        },
        
        stop: function() {
            return this.each(function() {
                var $this = $(this),
                    data = $this.data('stopwatch');
                clearInterval(data.timerID);
                data.active = false;
                $this.data('stopwatch', data);
            });
        },
        
        destroy: function() {
            return this.each(function(){
                var $this = $(this),
                    data = $this.data('stopwatch');
                $this.stopwatch('stop').unbind('.stopwatch').removeData('stopwatch');
            });
        },
        
        render: function() {
            var $this = $(this),
                data = $this.data('stopwatch');
            
            // update left row "Worked Time"
            // check every 60 seconds, it´s better for performance
            if(currentSeconds == 1){
                
                // locate elements
                var locateClickedTd = $this.parent('td');
                var locateProgressBar = locateClickedTd.prev().find('.bar');
                var locateWorkedTimeWrapper = locateClickedTd.prev().prev('.worked_time');
                
                // guess & worked time
                var getWorkedHours = locateWorkedTimeWrapper.data('worked-hours');
                var getWorkedMinutes = locateWorkedTimeWrapper.data('worked-minutes');
                var getGuessHours = locateWorkedTimeWrapper.data('guess-hours');
                var getGuessMinutes = locateWorkedTimeWrapper.data('guess-minutes');
                
                // task informations
                var getTaskId = locateWorkedTimeWrapper.data('task-id');
                var getTaskName = locateWorkedTimeWrapper.data('task-name');
                
                // api key
                var apiKey = $.cookie('asana-api-key');
                
                // calculate new worked time
                var newHours = getWorkedHours+currentHours;
                var newMinutes = getWorkedMinutes+currentMinutes;
                                
                // calculate progress
                var percent = (getGuessHours*60*1000 + getGuessMinutes * 1000) / 100;
                    percent = (newHours*60*1000 + newMinutes * 1000) / percent;
                    locateProgressBar.css('width', percent + '%');
                    
                // render new worked time into left row "Worked Time"
                locateWorkedTimeWrapper.html(newHours + 'h ' + newMinutes + 'm');
                
                // save interval
                --saveInterval;
                
                if(saveInterval == 0){
                          
                    $.ajax({
                      type: "GET",
                      url: "request.php",
                      data: "apiKey=" + apiKey + "&updateId=" + getTaskId + "&guessHours=" + getGuessHours + "&guessMinutes=" + getGuessMinutes + "&workedHours=" + newHours + "&workedMinutes=" + newMinutes + "&taskName=" + getTaskName,
                      success: function( result ) {
                         //console.log('auto saved');
                        },
                      error : function( msg ) {
                         //console.log('something went wrong...');
                        }
                    });
                          
                   // set interval again                    
                   saveInterval = 1; 
                }
                
            }

            $this.html(data.formatter(data.elapsed, data));
        },

        getTime: function() {
            var $this = $(this),
                data = $this.data('stopwatch');
            return data.elapsed;
        },
        
        toggle: function() {
            return this.each(function() {
                var $this = $(this);
                var data = $this.data('stopwatch');
                
                // toggle progress bar active state
                var locateClickedTd = $this.parent('td');
                var locateProgressBar = locateClickedTd.prev().find('.progress');
                    locateProgressBar.toggleClass('active');
    
                if (data.active) {
                    $this.stopwatch('stop');
                } else {
                    $this.stopwatch('start');
                }
            });
        },
        
        reset: function() {
            return this.each(function() {
                var $this = $(this);
                    data = $this.data('stopwatch');
                data.incrementer = incrementer(data.startTime, data.updateInterval);
                data.elapsed = data.startTime;
                $this.data('stopwatch', data);
            });
        }
    };
    
    
    // Define the function
    $.fn.stopwatch = function( method ) {
        
        if (methods[method]) {
            return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error( 'Method ' +  method + ' does not exist on jQuery.stopwatch' );
        }
    };
    

})( jQuery );