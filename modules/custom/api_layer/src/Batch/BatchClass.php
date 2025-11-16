<?php

namespace Drupal\api_layer\Batch;

/**
 * Defines a process and finish method for a batch.
 */
class BatchClass {

  /**
   * Process a batch operation.
   *
   * @param int $batchId
   *   The batch ID.
   * @param array $chunk
   *   The chunk to process.
   * @param array $context
   *   Batch context.
   */
  public static function batchProcess($id, $nid, &$context): void {

    $context['results'][] = $id;
    // Optional message displayed under the progressbar.
    $context['message'] = t('Delete external news "@id" @details', [
      '@id' => $id,
      '@details' => $nid,
    ]);

    if (!empty($nid)) {
        $storage_handler = \Drupal::entityTypeManager()->getStorage('node');
        $node = $storage_handler->load($nid);
        $storage_handler->delete([$node]);
    }
  }

  /**
   * Handle batch completion.
   *
   * @param bool $success
   *   TRUE if all batch API tasks were completed successfully.
   * @param array $results
   *   An results array from the batch processing operations.
   * @param array $operations
   *   A list of the operations that had not been completed.
   * @param string $elapsed
   *   Batch.inc kindly provides the elapsed processing time in seconds.
   */
  public static function batchFinished(bool $success, array $results, array $operations, string $elapsed): void {
    if ($success) {
      // Here we could do something meaningful with the results.
      // We just display the number of nodes we processed...
      $this->messenger->addMessage(t('@count results processed.', [
        '@count' => count($results),
      ]));
    }
    else {
      // An error occurred.
      // $operations contains the operations that remained unprocessed.
      $error_operation = reset($operations);
      $this->messenger->addError(t('An error occurred while processing @operation with arguments : @args', [
        '@operation' => $error_operation[0],
        '@args' => print_r($error_operation[0], TRUE),
      ]));
    }
  }

}