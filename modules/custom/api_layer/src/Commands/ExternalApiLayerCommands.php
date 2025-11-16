<?php

namespace Drupal\api_layer\Commands;

use Consolidation\OutputFormatters\StructuredData\RowsOfFields;
use Drush\Commands\DrushCommands;
use Drupal\api_layer\Batch\BatchClass;
use Drupal\Core\Batch\BatchBuilder;

/**
 * A ExternalApiLayerCommands.
 */
class ExternalApiLayerCommands extends DrushCommands {  
  /**
   * Delete old external content.
   *
   * @param $days
   *   Delte old contents created before this days.
   * @command api_layer:delete
   */
  public function delete($days = 7, $options = ['custom' => false]) {
    $threshold = \Drupal::time()->getRequestTime() - ($days * 24 * 60 * 60); // 7 days ago

    $query = \Drupal::entityQuery('node')
        ->condition('type', 'external')
        ->condition('created', $threshold, '<')
        ->accessCheck(TRUE);
    $nids = $query->execute();

    $batch = new BatchBuilder();
    $batchId = 1;
    // Process each chunk in the array.
    foreach ($nids as $nid) {
      $args = [
        $batchId,
        $nid
      ];
      $batch->addOperation([BatchClass::class, 'batchProcess'], $args);
      $batchId++;
    }
    batch_set($batch->toArray());

    drush_backend_batch_process();

    // Finish.
    $this->logger()->notice("Batch operations end.");
    return $this->logger()->log('success',dt('Message: @msg',['@msg'=>'finished deleting old external content.']));
  }}