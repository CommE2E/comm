<?php

require_once('../config.php');
require_once('../permissions.php');

$recalc_results = recalculate_all_permissions(79571, 3);
$recalc_to_save = $recalc_results['to_save'];
$recalc_to_delete = $recalc_results['to_delete'];
save_memberships($recalc_to_save);
delete_memberships($recalc_to_delete);
