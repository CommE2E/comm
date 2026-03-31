moved {
  from = aws_lb.backup_service
  to   = aws_lb.backup_service[0]
}

moved {
  from = aws_lb_listener.backup_service_https
  to   = aws_lb_listener.backup_service_https[0]
}

moved {
  from = aws_lb_target_group.backup_service_http_fargate
  to   = aws_lb_target_group.backup_service_http_fargate[0]
}

moved {
  from = aws_lb.blob_service
  to   = aws_lb.blob_service[0]
}

moved {
  from = aws_lb_listener.blob_service_https
  to   = aws_lb_listener.blob_service_https[0]
}

moved {
  from = aws_lb_target_group.blob_service_http_fargate
  to   = aws_lb_target_group.blob_service_http_fargate[0]
}

moved {
  from = aws_lb.identity_service
  to   = aws_lb.identity_service[0]
}

moved {
  from = aws_lb_listener.identity_service_ws
  to   = aws_lb_listener.identity_service_ws[0]
}

moved {
  from = aws_lb_listener.identity_service_grpc
  to   = aws_lb_listener.identity_service_grpc[0]
}

moved {
  from = aws_lb_target_group.identity_service_ws_fargate
  to   = aws_lb_target_group.identity_service_ws_fargate[0]
}

moved {
  from = aws_lb_target_group.identity_service_grpc_fargate
  to   = aws_lb_target_group.identity_service_grpc_fargate[0]
}

moved {
  from = aws_lb.tunnelbroker
  to   = aws_lb.tunnelbroker[0]
}

moved {
  from = aws_lb_listener.tunnelbroker_ws
  to   = aws_lb_listener.tunnelbroker_ws[0]
}

moved {
  from = aws_lb_target_group.tunnelbroker_ws_fargate
  to   = aws_lb_target_group.tunnelbroker_ws_fargate[0]
}

moved {
  from = aws_lb.reports_service
  to   = aws_lb.reports_service[0]
}

moved {
  from = aws_lb_listener.reports_service_https
  to   = aws_lb_listener.reports_service_https[0]
}

moved {
  from = aws_lb_target_group.reports_service_http
  to   = aws_lb_target_group.reports_service_http[0]
}

moved {
  from = aws_lb.electron_update
  to   = aws_lb.electron_update[0]
}

moved {
  from = aws_lb_listener.electron_update_https
  to   = aws_lb_listener.electron_update_https[0]
}

moved {
  from = aws_lb_target_group.electron_update_ecs
  to   = aws_lb_target_group.electron_update_ecs[0]
}
