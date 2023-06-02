apt remove -y amazon-ssm-agent amazon-ecs-init
rm -rf /var/lib/amazon/ssm/Vault/Store/RegistrationKey
rm -rf /var/lib/ecs/ecs.config
rm -rf /etc/ecs/ecs.config
rm -rf /var/lib/ecs/data/*