Electrode {

	{ Name="WL1"  Voltage=0 Workfunction=_WF_ Voltage=(
	!(
    set dt 1.50e-4
    set tR 2.00e-4
    set t1p 5e-7

    for { set i 1 } { $i <= @Steps@ } { incr i } {
    	set t2p [expr $t1p + 1.5e-7]
        set t3p [expr $t1p + $dt]
    	set t4p [expr $t2p + $dt]

        puts "0 at $t1p, _Vpassp_ at $t2p, _Vpassp_ at $t3p, 0 at $t4p"
        set t1p [expr $t4p + $tR]
    }
	)!
    )  }
	{Name="source" Voltage= 0.0 }

}
